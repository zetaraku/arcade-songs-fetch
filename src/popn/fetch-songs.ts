/* eslint-disable no-await-in-loop */
/* eslint-disable newline-per-chained-call */
import axios from 'axios';
import sleep from 'sleep-promise';
import log4js from 'log4js';
import * as cheerio from 'cheerio';
import { Song, Sheet, JpSheet, SongArtist } from '@@/db/popn/models';
import 'dotenv/config';

const logger = log4js.getLogger('popn/fetch-songs');
logger.level = log4js.levels.INFO;

const VERSION_ID = 'unilab';

const DATA_URL = 'https://p.eagate.573.jp';

const categoryMap = new Map([
  [21, 'TV･ｱﾆﾒ'],
  [23, 'BEMANI'],
  //! add further category here !//
]);

const versionMap = new Map([
  [0, 'pop\'n 1'],
  [1, 'pop\'n 2'],
  [2, 'pop\'n 3'],
  [3, 'pop\'n 4'],
  [4, 'pop\'n 5'],
  [5, 'pop\'n 6'],
  [6, 'pop\'n 7'],
  [7, 'pop\'n 8'],
  [8, 'pop\'n 9'],
  [9, 'pop\'n 10'],
  [10, 'pop\'n 11'],
  [11, 'pop\'n 12 いろは'],
  [12, 'pop\'n 13 カーニバル'],
  [13, 'pop\'n 14 FEVER!'],
  [14, 'pop\'n 15 ADVENTURE'],
  [15, 'pop\'n 16 PARTY♪'],
  [16, 'pop\'n 17 THE MOVIE'],
  [17, 'pop\'n 18 せんごく列伝'],
  [18, 'pop\'n 19 TUNE STREET'],
  [19, 'pop\'n 20 fantasia'],
  [20, 'pop\'n Sunny Park'],
  [21, 'TV･ｱﾆﾒ'],
  [22, 'CS'],
  [23, 'BEMANI'],
  [24, 'pop\'n ラピストリア'],
  [25, 'pop\'n éclale'],
  [26, 'pop\'n うさぎと猫と少年の夢'],
  [27, 'pop\'n peace'],
  [28, 'pop\'n 解明リドルズ'],
  [29, 'pop\'n UniLab'],
  //! add further version here !//
]);

const isCategory = (versionId: number) => categoryMap.has(versionId);
const isVersion = (versionId: number) => !categoryMap.has(versionId);

export async function getCookies() {
  if (process.env.POPN_JP_KONAMI_SESSION_TOKEN) {
    return { M573SSID: process.env.POPN_JP_KONAMI_SESSION_TOKEN };
  }

  throw new Error('Please set your POPN_JP_KONAMI_SESSION_TOKEN in the .env file');
}

async function* fetchSongs(versionId: number, cookies: Record<string, string>) {
  async function* startFetchPage(pageNo = 0): AsyncGenerator<Record<string, any>[]> {
    logger.info(`- page ${pageNo}`);

    const response = await axios.get(`${DATA_URL}/game/popn/${VERSION_ID}/playdata/mu_top.html`, {
      headers: {
        Cookie: `M573SSID=${cookies.M573SSID};`,
      },
      params: {
        version: versionId,
        page: pageNo,
      },
    });

    const $ = cheerio.load(response.data);

    if ($('#err_table').length > 0) {
      throw new Error($('#err_table h4').text().trim());
    }

    const songs = $('.mu_list_table > li').toArray().slice(1)
      .map((li) => {
        const detailUrl = new URL($(li).find('.col_music > a').attr('href')!, DATA_URL).toString();
        const id = new URL(detailUrl).searchParams.get('no');
        const title = $(li).find('.col_music > a').text().trim();
        // const genre = $(li).find('.col_music > div').text().trim();

        const rawSong = {
          id,

          category: isCategory(versionId) ? categoryMap.get(versionId) : null,
          title,
          artist: null,

          imageName: 'default-cover.png',
          imageUrl: null,

          version: isVersion(versionId) ? versionMap.get(versionId) : null,
          releaseDate: null,

          isNew: null,
          isLocked: null,

          comment: null,

          detailUrl,
        };

        return {
          // songId will be assigned during merge
          ...rawSong,
        };
      });

    yield songs;

    if ($('a:contains("次へ>>")').length > 0) {
      await sleep(500);
      yield* startFetchPage(pageNo + 1);
    }
  }

  yield* startFetchPage();
}

async function* fetchSheets(levelValue: number, cookies: Record<string, string>) {
  async function* startFetchPage(pageNo = 0): AsyncGenerator<Record<string, any>[]> {
    logger.info(`- page ${pageNo}`);

    const response = await axios.get(`${DATA_URL}/game/popn/${VERSION_ID}/playdata/mu_lv.html`, {
      headers: {
        Cookie: `M573SSID=${cookies.M573SSID};`,
      },
      params: {
        level: levelValue,
        page: pageNo,
      },
    });

    const $ = cheerio.load(response.data);

    if ($('#err_table').length > 0) {
      throw new Error($('#err_table h4').text().trim());
    }

    const sheets = $('.mu_list_table > li').toArray().slice(1)
      .map((li) => {
        const id = new URL($(li).find('.col_music_lv > a').attr('href')!, DATA_URL).searchParams.get('no');
        const title = $(li).find('.col_music_lv > a').text().trim();
        // const genre = $(li).find('.col_music_lv > div').text().trim();

        const difficulty = $(li).find('.col_normal_lv').text().trim().toLowerCase();
        const level = $(li).find('.col_hyper_lv').text().trim();

        const rawSheet = {
          id,

          title,

          type: 'std',
          difficulty,
          level,
        };

        return {
          // songId will be assigned during merge
          ...rawSheet,
        };
      });

    yield sheets;

    if ($('a:contains("次へ>>")').length > 0) {
      await sleep(500);
      yield* startFetchPage(pageNo + 1);
    }
  }

  yield* startFetchPage();
}

async function* fetchSongArtists(songs: Record<string, any>[], cookies: Record<string, string>) {
  async function fetchSongArtist(song: Record<string, any>) {
    const response = await axios.get(song.detailUrl, {
      headers: {
        Cookie: `M573SSID=${cookies.M573SSID};`,
      },
    });

    const $ = cheerio.load(response.data);

    if ($('#err_table').length > 0) {
      throw new Error($('#err_table h4').text().trim());
    }

    const artist = $('#artist').text().trim();

    return {
      songId: song.songId,
      artist,
    };
  }

  const existedSongArtists = await SongArtist.findAll<any>();
  const songsToFetch = songs.filter(
    (song) => !existedSongArtists.some((songArtist) => songArtist.songId === song.songId),
  );
  logger.info(`Found ${songsToFetch.length} page(s) to fetch.`);

  for (const [index, song] of songsToFetch.entries()) {
    try {
      logger.info(`(${1 + index} / ${songsToFetch.length}) Updating song artist for: ${song.title} ...`);
      yield await fetchSongArtist(song);
    } catch (e) {
      logger.error(e);
      break;
    } finally {
      await sleep(200);
    }
  }
}

function mergeSongs(songs: Record<string, any>[]) {
  const mergedSongs = new Map<string, Record<string, any>>();
  const lastTitleNo = new Map<string, number>();

  for (const song of songs) {
    if (mergedSongs.has(song.id)) {
      const mergedSong = mergedSongs.get(song.id)!;

      // move the entry to the last if the version will be updated
      if (mergedSong.version === null && song.version !== null) {
        mergedSongs.delete(song.id);
        mergedSongs.set(song.id, mergedSong);
      }

      mergedSong.category ??= song.category;
      mergedSong.version ??= song.version;
    } else {
      const currNo = (lastTitleNo.get(song.title) ?? 0) + 1;
      lastTitleNo.set(song.title, currNo);
      song.songId = currNo > 1 ? `${song.title} (${currNo})` : song.title;

      mergedSongs.set(song.id, song);
    }
  }

  return Array.from(mergedSongs.values());
}

export default async function run() {
  logger.info('Logging in to get the required cookies ...');
  const cookies = await getCookies();

  if (!cookies.M573SSID) {
    throw new Error('Failed to get the required cookies. (Login Failed)');
  }

  logger.info(`Fetching songs from: ${DATA_URL} ...`);
  const rawSongs: Record<string, any>[] = [];
  for (const [versionId, version] of versionMap.entries()) {
    logger.info(`* version '${version}' (${versionId})`);

    for await (const pageOfSongs of fetchSongs(versionId, cookies)) {
      rawSongs.push(...pageOfSongs);
    }
  }

  logger.info('Merging duplicate songs in different versions ...');
  const songs = mergeSongs(rawSongs);
  logger.info(`OK, ${rawSongs.length} raw songs merged into ${songs.length} songs.`);

  logger.info(`Fetching sheets from: ${DATA_URL} ...`);
  const sheets: Record<string, any>[] = [];
  for (let levelValue = 1; levelValue <= 50; levelValue += 1) {
    logger.info(`* level ${levelValue}`);

    for await (const pageOfSheets of fetchSheets(levelValue, cookies)) {
      for (const sheet of pageOfSheets) {
        sheet.songId = songs.find((song) => song.id === sheet.id)?.songId;
        sheets.push(sheet);
      }
    }
  }

  logger.info('Updating songs ...');
  await Promise.all(songs.map((song) => Song.upsert(song)));

  logger.info('Updating sheets ...');
  await Promise.all(sheets.map((sheet) => Sheet.upsert(sheet)));

  logger.info('Truncating and Inserting jpSheets ...');
  await JpSheet.truncate();
  await JpSheet.bulkCreate(sheets);

  logger.info(`Fetching song artists from: ${DATA_URL} ...`);
  for await (const songArtist of fetchSongArtists(songs, cookies)) {
    await SongArtist.upsert(songArtist);
  }

  logger.info('Done!');
}

if (require.main === module) run();

/* eslint-disable object-curly-newline */
/* eslint-disable no-await-in-loop */
/* eslint-disable newline-per-chained-call */
import axios from 'axios';
import sleep from 'sleep-promise';
import log4js from 'log4js';
import * as cheerio from 'cheerio';
import { Song, Sheet, JpSheet, SongArtist } from '@@/db/popn/models';
import { concatOrCoalesceString, ensureNoDuplicateEntry } from '@/_core/utils';
import 'dotenv/config';

const logger = log4js.getLogger('popn/fetch-songs');
logger.level = log4js.levels.INFO;

const VERSION_ID = 'unilab';

const DATA_URL = 'https://p.eagate.573.jp';

const categoryMap = new Map([
  [21, 'TV･ｱﾆﾒ'],
  [22, 'CS'],
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
  [24, 'pop\'n ラピストリア'],
  [25, 'pop\'n éclale'],
  [26, 'pop\'n うさぎと猫と少年の夢'],
  [27, 'pop\'n peace'],
  [28, 'pop\'n 解明リドルズ'],
  [29, 'pop\'n UniLab'],
  [30, 'pop\'n Jam&Fizz'],
  //! add further version here !//
]);

const manualUpperMappingWithVersion = new Map([
  ['Aithon', [null, 'pop\'n peace']],
  ['Blue River', [null, 'pop\'n peace']],
  ['Butter-FLY', ['pop\'n 17 THE MOVIE', 'pop\'n 解明リドルズ']],
  ['FLOWER', ['pop\'n 20 fantasia', 'pop\'n peace']],
  ['GET WILD', ['pop\'n 13 カーニバル', 'pop\'n 解明リドルズ']],
  ['Little prayer', [null, 'pop\'n 解明リドルズ']],
  ['MADSPEED狂信道', ['pop\'n éclale', 'pop\'n peace']],
  ['Russian Caravan Rhapsody', ['pop\'n ラピストリア', 'pop\'n 解明リドルズ']],
  ['ZETA〜素数の世界と超越者〜', ['pop\'n 15 ADVENTURE', 'pop\'n 解明リドルズ']],
  ['murmur twins(guitar pop ver.)', ['pop\'n 10', 'pop\'n peace']],
  ['nostos', ['pop\'n うさぎと猫と少年の夢', 'pop\'n peace']],
  ['only my railgun', ['pop\'n 19 TUNE STREET', 'pop\'n UniLab']],
  ['perditus†paradisus', ['pop\'n ラピストリア', 'pop\'n peace']],
  ['いーあるふぁんくらぶ', ['pop\'n ラピストリア', 'pop\'n Jam&Fizz']],
  ['エイプリルフールの唄', ['pop\'n 12 いろは', 'pop\'n peace']],
  ['クラゲータ', ['pop\'n 11', 'pop\'n peace']],
  ['シャムシールの舞', ['pop\'n 14 FEVER!', 'pop\'n peace']],
  ['シュガーソングとビターステップ', ['pop\'n éclale', 'pop\'n 解明リドルズ']],
  ['セツナトリップ', ['pop\'n Sunny Park', 'pop\'n 解明リドルズ']],
  ['ナスカの丘', ['pop\'n 19 TUNE STREET', 'pop\'n 解明リドルズ']],
  ['ポルターガイスト', ['pop\'n 16 PARTY♪', 'pop\'n 解明リドルズ']],
  ['一触即発☆禅ガール', ['pop\'n peace', 'pop\'n Jam&Fizz']],
  ['創聖のアクエリオン', ['pop\'n 16 PARTY♪', 'pop\'n 解明リドルズ']],
  ['夏祭り', ['pop\'n 17 THE MOVIE', 'pop\'n 解明リドルズ']],
  ['夢幻ノ光', ['pop\'n 12 いろは', 'pop\'n peace']],
  ['子供の落書き帳', [null, 'pop\'n peace']],
  ['少年リップルズ', ['pop\'n 19 TUNE STREET', 'pop\'n 解明リドルズ']],
  ['序', ['pop\'n 18 せんごく列伝', 'pop\'n peace']],
  ['桃花恋情', ['pop\'n 15 ADVENTURE', 'pop\'n 解明リドルズ']],
  ['残酷な天使のテーゼ', ['pop\'n 12 いろは', 'pop\'n UniLab']],
  ['生命の焔纏いて', ['pop\'n Sunny Park', 'pop\'n 解明リドルズ']],
  ['真超深ＴＩＯＮ', ['pop\'n 13 カーニバル', 'pop\'n peace']],
  ['路男', ['pop\'n 15 ADVENTURE', 'pop\'n 解明リドルズ']],
  ['雫', ['pop\'n 12 いろは', 'pop\'n peace']],
  ['鳳凰〜Chinese Phoenix Mix〜', ['pop\'n 20 fantasia', 'pop\'n 解明リドルズ']],
]);

const manualAltMappingWithGenre = new Map([
  ['つぼみ', ['ピンキッシュ', 'つぼみ']],
  ['Denpasar', ['バリトランス', 'ウラ・バリトランス']],
  ['H@ppy Choice', ['メロコア', 'メロコアＬＩＶＥ']],
  ['Homesick Pt.2&3', ['ソフトロック', 'ソフトロックＬＯＮＧ']],
  ['I REALLY WANT TO HURT YOU', ['ポップス', 'ポップスアンコール']],
  ['cat\'s scat', ['スキャット', 'ウラ・スキャット']],
  ['une fille dans la pluie', ['フレンチポップ', 'フレンチポップＪ']],
  ['今宵Lover\'s Day', ['パッション', 'パッションＬＩＶＥ']],
  ['光の季節', ['メロウ', 'メロウREMIX']],
  ['男々道', ['ヒップロック２', 'ウラ・ヒップロック2']],
  ['西新宿清掃曲', ['パーカッシヴ', 'ウラ・パーカッシヴ']],
  ['赤いリンゴ', ['グルーブロック', 'グルーブロックＬＩＶＥ']],
]);

function getSheetType(rawSong: Record<string, any>) {
  const { title, version, id } = rawSong;

  if (title === 'Popperz Chronicle') {
    if (id === 'H2sHxwnmJmfPvtJL/5TpSQ==') return 'std';
    if (id === 'wCYAsaXbEgmT2HqFoX4qCQ==') return 'upper';

    throw new Error(`Unable to resolve sheet type: ${JSON.stringify(rawSong)}`);
  }

  if (manualUpperMappingWithVersion.has(title)) {
    const versions = manualUpperMappingWithVersion.get(title)!;
    const versionPos = versions.indexOf(version);

    if (versionPos === 0) return 'std';
    if (versionPos === 1) return 'upper';

    throw new Error(`Cannot use manual mapping with version: ${JSON.stringify(rawSong)}`);
  }

  return 'std';
}

function getSongId(rawSong: Record<string, any>) {
  const { title, genre, sheetType } = rawSong;

  if (manualAltMappingWithGenre.has(title)) {
    const genres = manualAltMappingWithGenre.get(title)!;
    const genrePos = genres.indexOf(genre);

    if (genrePos === 0) return title;
    if (genrePos >= 1) return `${title} (${1 + genrePos})`;

    throw new Error(`Cannot use manual mapping with genre: ${JSON.stringify(rawSong)}`);
  }

  if (sheetType === 'upper') {
    return `(UPPER) ${title}`;
  }

  return title;
}

export async function getCookies() {
  if (process.env.POPN_JP_KONAMI_SESSION_TOKEN) {
    return { M573SSID: process.env.POPN_JP_KONAMI_SESSION_TOKEN };
  }

  throw new Error('Please set your POPN_JP_KONAMI_SESSION_TOKEN in the .env file');
}

async function* fetchSongs(versionOrCategoryId: number, cookies: Record<string, string>) {
  async function* startFetchPage(pageNo = 0): AsyncGenerator<Record<string, any>[]> {
    logger.info(`- page ${pageNo}`);

    const response = await axios.get(`${DATA_URL}/game/popn/${VERSION_ID}/playdata/mu_top.html`, {
      headers: {
        Cookie: `M573SSID=${cookies.M573SSID};`,
      },
      params: {
        version: versionOrCategoryId,
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
        const genre = $(li).find('.col_music > div').text().trim();

        const rawSong = {
          id,
          genre,

          category: categoryMap.get(versionOrCategoryId) ?? null,
          title,
          artist: null,

          imageName: 'default-cover.png',
          imageUrl: null,

          version: versionMap.get(versionOrCategoryId) ?? null,
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
        const title = $(li).find('.col_music_lv > a').text().trim()
          // changed from pop'n Jam&Fizz
          .replaceAll(/* FULL WIDTH TILDE */ '～', /* WAVE DASH */ '〜');
        const genre = $(li).find('.col_music_lv > div').text().trim();

        const difficulty = $(li).find('.col_normal_lv').text().trim().toLowerCase();
        const level = $(li).find('.col_hyper_lv').text().trim();

        const rawSheet = {
          id,
          genre,

          title,

          // type will be assigned during merge
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

  for (const song of songs) {
    if (mergedSongs.has(song.id)) {
      const mergedSong = mergedSongs.get(song.id)!;

      mergedSong.category = concatOrCoalesceString(mergedSong.category, song.category);
      mergedSong.version ??= song.version;
    } else {
      mergedSongs.set(song.id, song);
    }
  }

  const mergedSongsList = [...mergedSongs.values()]
    .toSorted((a, b) => Number(a.version != null) - Number(b.version != null));

  for (const song of mergedSongsList) {
    song.sheetType = getSheetType(song);
    song.songId = getSongId(song);
  }

  return mergedSongsList;
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
  for (const [categoryId, category] of categoryMap.entries()) {
    logger.info(`* category '${category}' (${categoryId})`);

    for await (const pageOfSongs of fetchSongs(categoryId, cookies)) {
      rawSongs.push(...pageOfSongs);
    }
  }

  logger.info('Merging duplicate songs in different versions ...');
  const songs = mergeSongs(rawSongs);
  logger.info(`OK, ${rawSongs.length} raw songs merged into ${songs.length} songs.`);

  logger.info('Ensuring every song has an unique songId ...');
  ensureNoDuplicateEntry(songs.map((song) => song.songId));

  logger.info(`Fetching sheets from: ${DATA_URL} ...`);
  const sheets: Record<string, any>[] = [];
  for (let levelValue = 1; levelValue <= 50; levelValue += 1) {
    logger.info(`* level ${levelValue}`);

    for await (const pageOfSheets of fetchSheets(levelValue, cookies)) {
      for (const sheet of pageOfSheets) {
        const parentSong = songs.find((song) => song.id === sheet.id)!;
        sheet.songId = parentSong.songId;
        sheet.type = parentSong.sheetType;

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

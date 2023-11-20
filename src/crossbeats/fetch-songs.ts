/* eslint-disable no-await-in-loop */
import axios from 'axios';
import sleep from 'sleep-promise';
import log4js from 'log4js';
import * as cheerio from 'cheerio';
import { hashed, ensureNoDuplicateEntry } from '@/_core/utils';
import { Song, Sheet, SongBpm } from '@@/db/crossbeats/models';

const logger = log4js.getLogger('crossbeats/fetch-songs');
logger.level = log4js.levels.INFO;

const DATA_URL = 'https://www.capcom.co.jp';
const IMAGE_BASE_URL = 'https://www.capcom.co.jp/arcade/rev/PC/';

const categories = [
  { categoryId: 'jpop', category: 'J-POP' },
  { categoryId: 'vocaloid', category: 'VOCALOID™' },
  { categoryId: 'toho', category: '東方Project' },
  { categoryId: 'originaln', category: 'ORIGINAL' },
  { categoryId: 'variety', category: 'VARIETY' },
  //! add further category here !//
];

function getSongId(rawSong: Record<string, any>) {
  const { title } = rawSong;

  return title;
}

async function* getPages(categoryId: string) {
  const category = categories.find((e) => e.categoryId === categoryId)?.category;

  logger.info(`* category '${category}'`);

  const pagePath = `arcade/rev/PC/music_${categoryId}.html`;

  async function* startFetchPage(pageNo = 1): AsyncGenerator<Record<string, any>[]> {
    logger.info(`- page ${pageNo}`);

    const response = await axios.get(`${DATA_URL}/${pagePath}`, {
      params: {
        page: pageNo,
      },
    });

    const $ = cheerio.load(response.data);

    const songs = $('.n-mList > li').toArray()
      .map((li) => {
        const imagePath = $(li).find('.n-mListImg').attr('src')!;

        const title = $(li).find('.n-mTitle').text().trim();
        const artist = $(li).find('.n-mAuther').text().trim();

        const imageUrl = new URL(imagePath, IMAGE_BASE_URL).toString();
        const imageName = `${hashed(imageUrl)}.png`;

        const bpm = Number.parseFloat($(li).find('.n-mDataBpm > span').text().trim()) || null;

        const levels = $(li).find('.n-mDataLv > span').toArray()
          .map((e) => $(e).text().trim())
          .map((e) => (e !== '--' ? e : null));

        const rawSong = {
          category,
          title,
          artist,

          imageName,
          imageUrl,

          level_easy: levels[0],
          level_standard: levels[1],
          level_hard: levels[2],
          level_master: levels[3],
          level_unlimited: levels[4],

          version: null,
          releaseDate: null,

          isNew: null,
          isLocked: null,

          bpm,
        };

        return {
          songId: getSongId(rawSong),
          ...rawSong,
        };
      });

    yield songs;

    if (songs.length > 0) {
      await sleep(500);
      yield* startFetchPage(pageNo + 1);
    }
  }

  yield* startFetchPage();
}

function mergeSongs(songs: Record<string, any>[]) {
  const mergedSongs = new Map<string, Record<string, any>>();

  for (const song of songs) {
    if (mergedSongs.has(song.songId)) {
      const mergedSong = mergedSongs.get(song.songId)!;

      if (song.artist !== mergedSong.artist) {
        throw new Error(`Same songId with different artist detected: ${song.songId}`);
      }

      mergedSong.category += `|${song.category}`;
    } else {
      mergedSongs.set(song.songId, song);
    }
  }

  return Array.from(mergedSongs.values());
}

function extractSheets(song: Record<string, any>) {
  return [
    { type: 'std', difficulty: 'easy', level: song.level_easy },
    { type: 'std', difficulty: 'standard', level: song.level_standard },
    { type: 'std', difficulty: 'hard', level: song.level_hard },
    { type: 'std', difficulty: 'master', level: song.level_master },
    { type: 'std', difficulty: 'unlimited', level: song.level_unlimited },
  ].filter((e) => !!e.level).map((rawSheet) => ({
    songId: song.songId,
    ...rawSheet,
  }));
}

export default async function run() {
  let songs: Record<string, any>[] = [];

  logger.info(`Fetching data from: ${DATA_URL} ...`);
  for (const { categoryId } of categories) {
    for await (const pageOfSongs of getPages(categoryId)) {
      songs.push(...pageOfSongs);
    }
  }
  logger.info(`OK, ${songs.length} songs fetched.`);

  logger.info('Merging duplicate songs in different categories ...');
  songs = mergeSongs(songs);
  logger.info(`OK, merged into ${songs.length} songs.`);

  logger.info('Ensuring every song has an unique songId ...');
  ensureNoDuplicateEntry(songs.map((song) => getSongId(song)));

  const sheets = songs.flatMap((song) => extractSheets(song));

  logger.info('Updating songs ...');
  await Promise.all(songs.map((song) => Song.upsert(song)));
  await Promise.all(songs.map((song) => SongBpm.upsert(song)));

  logger.info('Updating sheets ...');
  await Promise.all(sheets.map((sheet) => Sheet.upsert(sheet)));

  logger.info('Done!');
}

if (require.main === module) run();

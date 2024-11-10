/* eslint-disable object-curly-newline */
/* eslint-disable no-await-in-loop */
/* eslint-disable newline-per-chained-call */
import axios from 'axios';
import sleep from 'sleep-promise';
import log4js from 'log4js';
import * as cheerio from 'cheerio';
import { sequelize, Song, Sheet, JpSheet } from '@@/db/popn/models';
import { chunkBy, ensureNoDuplicateEntry, hashed } from '@/_core/utils';
import { mergeSongs } from './fetch-songs-v1';
import 'dotenv/config';

const logger = log4js.getLogger('popn/fetch-songs-v2');
logger.level = log4js.levels.INFO;

const VERSION_ID = 'jamfizz';

const DATA_URL = 'https://p.eagate.573.jp';
const IMAGE_BASE_URL = 'https://p.eagate.573.jp/';

const categoryMap = new Map([
  [1, 'TV・アニメ'],
  [2, 'CS'],
  [3, 'BEMANI'],
  //! add further category here !//
]);

const versionMap = new Map([
  [1, 'pop\'n 1'],
  [2, 'pop\'n 2'],
  [3, 'pop\'n 3'],
  [4, 'pop\'n 4'],
  [5, 'pop\'n 5'],
  [6, 'pop\'n 6'],
  [7, 'pop\'n 7'],
  [8, 'pop\'n 8'],
  [9, 'pop\'n 9'],
  [10, 'pop\'n 10'],
  [11, 'pop\'n 11'],
  [12, 'pop\'n 12 いろは'],
  [13, 'pop\'n 13 カーニバル'],
  [14, 'pop\'n 14 FEVER!'],
  [15, 'pop\'n 15 ADVENTURE'],
  [16, 'pop\'n 16 PARTY♪'],
  [17, 'pop\'n 17 THE MOVIE'],
  [18, 'pop\'n 18 せんごく列伝'],
  [19, 'pop\'n 19 TUNE STREET'],
  [20, 'pop\'n 20 fantasia'],
  [21, 'pop\'n Sunny Park'],
  [22, 'pop\'n ラピストリア'],
  [23, 'pop\'n éclale'],
  [24, 'pop\'n うさぎと猫と少年の夢'],
  [25, 'pop\'n peace'],
  [26, 'pop\'n 解明リドルズ'],
  [27, 'pop\'n UniLab'],
  [28, 'pop\'n Jam&Fizz'],
  //! add further version here !//
]);

async function* fetchSongs(versionId: number, categoryId: number) {
  async function* startFetchPage(pageNo = 0): AsyncGenerator<Record<string, any>[]> {
    logger.info(`- page ${pageNo}`);

    const response = await axios.get(`${DATA_URL}/game/popn/${VERSION_ID}/music/index.html`, {
      params: {
        version: versionId,
        category: categoryId,
        page: pageNo,
      },
    });

    const $ = cheerio.load(response.data);

    const songs = chunkBy($('.mu_list_table:not(.mu_head) > li').toArray(), 3)
      .map(([imageLi, infoLi, levelsLi]) => {
        const imageUrl = new URL($(imageLi).find('img').attr('src')!, IMAGE_BASE_URL).toString();
        const imageName = `${hashed(imageUrl)}.png`;

        const id = new URL(imageUrl).searchParams.get('img');
        const genre = $(infoLi).find('p:nth-of-type(1)').text().trim();
        const title = $(infoLi).find('p:nth-of-type(2)').text().trim();
        const artist = $(infoLi).find('p:nth-of-type(3)').text().trim();

        const levels = $(levelsLi).find('p').toArray()
          .map((e) => $(e).data('d'))
          .map((e) => (e !== '-' ? e : null));

        const rawSong = {
          id,
          genre,

          category: categoryMap.get(categoryId) ?? null,
          title,
          artist,

          imageName,
          imageUrl,

          lev_easy: levels[0],
          lev_normal: levels[1],
          lev_hyper: levels[2],
          lev_ex: levels[3],

          version: versionMap.get(versionId) ?? null,
          releaseDate: null,

          isNew: null,
          isLocked: null,

          comment: null,
        };

        return {
          // songId will be assigned during merge
          ...rawSong,
        };
      });

    yield songs;

    if ($('a:contains(次へ>>)').length > 0) {
      await sleep(500);
      yield* startFetchPage(pageNo + 1);
    }
  }

  yield* startFetchPage();
}

function extractSheets(rawSong: Record<string, any>) {
  return [
    { difficulty: 'easy', level: rawSong.lev_easy },
    { difficulty: 'normal', level: rawSong.lev_normal },
    { difficulty: 'hyper', level: rawSong.lev_hyper },
    { difficulty: 'ex', level: rawSong.lev_ex },
  ].filter((e) => e.level != null).map((rawSheet) => ({
    songId: rawSong.songId,
    type: rawSong.sheetType,
    ...rawSheet,
  }));
}

export default async function run() {
  logger.info(`Fetching songs from: ${DATA_URL} ...`);
  const rawSongs: Record<string, any>[] = [];
  for (const [versionId, version] of versionMap.entries()) {
    logger.info(`* version '${version}' (${versionId})`);

    for await (const pageOfSongs of fetchSongs(versionId, /* ALL */ 0)) {
      rawSongs.push(...pageOfSongs);
    }
  }
  for (const [categoryId, category] of categoryMap.entries()) {
    logger.info(`* category '${category}' (${categoryId})`);

    for await (const pageOfSongs of fetchSongs(/* ALL */ 0, categoryId)) {
      rawSongs.push(...pageOfSongs);
    }
  }

  logger.info('Merging duplicate songs in different versions ...');
  const songs = mergeSongs(rawSongs);
  logger.info(`OK, ${rawSongs.length} raw songs merged into ${songs.length} songs.`);

  logger.info('Ensuring every song has an unique songId ...');
  ensureNoDuplicateEntry(songs.map((song) => song.songId));

  const sheets = songs.flatMap((rawSong) => extractSheets(rawSong));

  logger.info('Updating songs ...');
  await Promise.all(songs.map((song) => Song.upsert(song)));

  logger.info('Updating sheets ...');
  await Promise.all(sheets.map((sheet) => Sheet.upsert(sheet)));

  logger.info('Truncating and Inserting jpSheets ...');
  await JpSheet.truncate();
  await JpSheet.bulkCreate(sheets);

  logger.info('Done!');
}

if (require.main === module) run();

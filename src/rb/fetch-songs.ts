/* eslint-disable no-await-in-loop */
import axios from 'axios';
import sleep from 'sleep-promise';
import log4js from 'log4js';
import * as cheerio from 'cheerio';
import { hashed, ensureNoDuplicateEntry } from '@/_core/utils';
import { Song, Sheet } from '@@/db/rb/models';

const logger = log4js.getLogger('rb/fetch-songs');
logger.level = log4js.levels.INFO;

const VERSION_ID = 'reflesia';

const DATA_URL = 'https://p.eagate.573.jp';
const IMAGE_BASE_URL = 'https://p.eagate.573.jp/';

const listIds = ['li', 'ori'];
//! add further list here !//

function getSongId(rawSong: Record<string, any>) {
  const { title } = rawSong;

  return title;
}

async function* getPages(listId: string) {
  logger.info(`* list '${listId}'`);

  const pagePath = `game/reflec/${VERSION_ID}/p/music_list/index.html`;

  async function* startFetchPage(pageNo = 0): AsyncGenerator<Record<string, any>[]> {
    logger.info(`- page ${pageNo}`);

    const response = await axios.get(`${DATA_URL}/${pagePath}`, {
      params: {
        type: listId,
        page: pageNo,
      },
    });

    const $ = cheerio.load(response.data);

    const songs = $('#licence_music_list > li').toArray()
      .map((ul) => {
        const imagePath = $(ul).find('.jk_img > img').attr('src')!;

        const title = $(ul).find('.music_name').text().trim();
        const artist = $(ul).find('.artist').text().trim();

        const imageUrl = new URL(imagePath, IMAGE_BASE_URL).toString();
        const imageName = `${hashed(imageUrl)}.png`;

        const levels = $(ul).find('.music_level_list > li').toArray()
          .map((e) => $(e).text().trim().replace(/^LV/, ''));

        const rawSong = {
          category: null,
          title,
          artist,

          imageName,
          imageUrl,

          level_basic: levels[0],
          level_medium: levels[1],
          level_hard: levels[2],
          level_special: levels[3],

          version: null,
          releaseDate: null,

          isNew: null,
          isLocked: null,

          comment: null,
        };

        return {
          songId: getSongId(rawSong),
          ...rawSong,
        };
      });

    yield songs;

    if ($('.page_next > a').length > 0) {
      await sleep(500);
      yield* startFetchPage(pageNo + 1);
    }
  }

  yield* startFetchPage();
}

function extractSheets(song: Record<string, any>) {
  return [
    { type: 'std', difficulty: 'basic', level: song.level_basic },
    { type: 'std', difficulty: 'medium', level: song.level_medium },
    { type: 'std', difficulty: 'hard', level: song.level_hard },
    { type: 'std', difficulty: 'special', level: song.level_special },
  ].filter((e) => !!e.level).map((rawSheet) => ({
    songId: song.songId,
    ...rawSheet,
  }));
}

export default async function run() {
  const songs: Record<string, any>[] = [];

  logger.info(`Fetching data from: ${DATA_URL} ...`);
  for (const listId of listIds) {
    for await (const pageOfSongs of getPages(listId)) {
      songs.push(...pageOfSongs);
    }
  }
  logger.info(`OK, ${songs.length} songs fetched.`);

  logger.info('Ensuring every song has an unique songId ...');
  ensureNoDuplicateEntry(songs.map((song) => getSongId(song)));

  const sheets = songs.flatMap((song) => extractSheets(song));

  logger.info('Updating songs ...');
  await Promise.all(songs.map((song) => Song.upsert(song)));

  logger.info('Updating sheets ...');
  await Promise.all(sheets.map((sheet) => Sheet.upsert(sheet)));

  logger.info('Done!');
}

if (require.main === module) run();

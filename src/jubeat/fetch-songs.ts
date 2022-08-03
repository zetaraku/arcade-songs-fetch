/* eslint-disable no-await-in-loop */
import axios from 'axios';
import sleep from 'sleep-promise';
import log4js from 'log4js';
import * as cheerio from 'cheerio';
import { hashed, ensureNoDuplicateEntry } from '@/_core/utils';
import { Song, Sheet } from '@@/db/jubeat/models';

const logger = log4js.getLogger('jubeat/fetch-songs');
logger.level = log4js.levels.INFO;

const VERSION_ID = 'ave';

const DATA_URL = 'https://p.eagate.573.jp';
const IMAGE_BASE_URL = 'https://p.eagate.573.jp/';

const listIds = ['index', 'original'];
//! add further list here !//

function getSongId(rawSong: Record<string, any>) {
  return rawSong.title;
}

async function* getPages(listId: string) {
  logger.info(`* list '${listId}'`);

  const pagePath = `game/jubeat/${VERSION_ID}/music/${listId}.html`;

  async function* startFetchPage(pageNo = 1): AsyncGenerator<Record<string, any>[]> {
    logger.info(`- page ${pageNo}`);

    const response = await axios.get(`${DATA_URL}/${pagePath}`, {
      params: {
        page: pageNo,
      },
    });

    const $ = cheerio.load(response.data);

    const songs = $('#music_list .list_data').toArray()
      .map((div) => {
        const imagePath = $(div).find('.list_data > p > img').attr('src')!;

        // const [, id] = imagePath.match(/^(?:.*)\/id(.+)\.(?:.+)$/)!;

        const title = $(div).find('.list_data > ul > li:nth-of-type(1)').text().trim();
        const artist = $(div).find('.list_data > ul > li:nth-of-type(2)').text().trim();

        const imageUrl = new URL(imagePath, IMAGE_BASE_URL).toString();
        const imageName = `${hashed(imageUrl)}.png`;

        const levels = $(div).find('.list_data > ul > li:nth-of-type(3) > ul > li:nth-of-type(2n)').toArray()
          .map((e) => $(e).text().trim());

        const rawSong = {
          category: null,
          title,
          artist,

          imageName,
          imageUrl,

          level_basic: levels[0],
          level_advanced: levels[1],
          level_extreme: levels[2],

          version: null,
          releaseDate: null,

          isNew: null,
          isLocked: null,
        };

        return {
          songId: getSongId(rawSong),
          ...rawSong,
        };
      });

    yield songs;

    if ($('.next > a').attr('href') !== '#') {
      await sleep(500);
      yield* startFetchPage(pageNo + 1);
    }
  }

  yield* startFetchPage();
}

function extractSheets(song: Record<string, any>) {
  const type = song.title.endsWith(' [ 2 ]') ? 'v2' : 'std';

  return [
    { type, difficulty: 'basic', level: song.level_basic },
    { type, difficulty: 'advanced', level: song.level_advanced },
    { type, difficulty: 'extreme', level: song.level_extreme },
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

  songs.reverse();

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

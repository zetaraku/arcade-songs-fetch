/* eslint-disable no-await-in-loop */
import axios from 'axios';
import iconv from 'iconv-lite';
import sleep from 'sleep-promise';
import log4js from 'log4js';
import * as cheerio from 'cheerio';
import { Song, Sheet } from './models';
import { hashed, checkDuplicatedTitle } from '../core/utils';

const logger = log4js.getLogger('jubeat/fetch-songs');
logger.level = log4js.levels.INFO;

const VERSION_ID = 'festo';

const DATA_URL = 'https://p.eagate.573.jp';
const IMAGE_BASE_URL = 'https://p.eagate.573.jp/';

const listIds = [1, 2];
//! add further list here !//

async function* getPages(listId: number) {
  logger.info(`* list ${listId}`);

  const pagePath = `game/jubeat/${VERSION_ID}/information/music_list${listId}.html`;

  async function* startFetchPage(pageNo = 1): AsyncGenerator<Record<string, any>[]> {
    logger.info(`- page ${pageNo}`);

    const html = await axios.get(`${DATA_URL}/${pagePath}`, {
      params: {
        page: pageNo,
      },
      responseType: 'arraybuffer',
    })
      .then((response) => iconv.decode(response.data, 'Windows-31j'));

    const $ = cheerio.load(html);

    const songs = $('#music_list .list_data').toArray()
      .map((div) => {
        const imagePath = $(div).find('table tr:nth-of-type(1) td:nth-of-type(1) img').attr('src')!
          .replace('/common/images/', '/images/top/');

        const [, songId] = imagePath.match(/^(?:.*)\/id(.+)\.(?:.+)$/)!;

        const title = $(div).find('table tr:nth-of-type(1) td:nth-of-type(2)').text().trim();
        const artist = $(div).find('table tr:nth-of-type(2) td:nth-of-type(1)').text().trim();

        const imageUrl = new URL(imagePath, IMAGE_BASE_URL).toString();
        const imageName = `${hashed(imageUrl)}.png`;

        const levels = $(div).find('table tr:nth-of-type(3) td:nth-of-type(1) ul li:nth-of-type(2n)').toArray()
          .map((e) => $(e).text().trim());

        return {
          songId,

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
    category: song.category,
    title: song.title,
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

  const sheets = songs.flatMap((song) => extractSheets(song));
  checkDuplicatedTitle(songs, logger);

  logger.info('Preparing Songs table ...');
  await Song.sync();

  logger.info('Preparing Sheets table ...');
  await Sheet.sync();

  logger.info('Updating songs ...');
  await Promise.all(songs.map((song) => Song.upsert(song)));

  logger.info('Updating sheets ...');
  await Promise.all(sheets.map((sheet) => Sheet.upsert(sheet)));

  logger.info('Done!');
}

if (require.main === module) run();

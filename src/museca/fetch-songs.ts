import axios from 'axios';
import sleep from 'sleep-promise';
import log4js from 'log4js';
import * as cheerio from 'cheerio';
import { hashed, ensureNoDuplicateEntry } from '@/_core/utils';
import { sequelize, Song, Sheet } from '@@/db/museca/models';

const logger = log4js.getLogger('museca/fetch-songs');
logger.level = log4js.levels.INFO;

const VERSION_ID = 'msc_1half';

const DATA_URL = 'https://p.eagate.573.jp';
const IMAGE_BASE_URL = 'https://p.eagate.573.jp/';

function getSongId(rawSong: Record<string, any>) {
  const { title } = rawSong;

  return title;
}

async function* getPages() {
  const pagePath = `game/museca/${VERSION_ID}/music/index.html`;

  async function* startFetchPage(pageNo = 0): AsyncGenerator<Record<string, any>[]> {
    logger.info(`- page ${pageNo}`);

    const response = await axios.get(`${DATA_URL}/${pagePath}`, {
      params: {
        filter: 0,
        sort_type: 0,
        page: pageNo,
      },
    });

    const $ = cheerio.load(response.data);

    const songs = $('#music_list_inner .masonry_item').toArray()
      .map((ul) => {
        const imagePath = $(ul).find('.music_jacket > img').attr('src')!;

        const title = $(ul).find('.music_title').text().trim();
        const artist = $(ul).find('.artist_name').text().trim();

        const imageUrl = new URL(imagePath, IMAGE_BASE_URL).toString();
        const imageName = `${hashed(imageUrl)}.png`;

        const levels = $(ul).find('.music_level_inner > .music_level > .num').toArray()
          .map((e) => $(e).text().trim());

        const rawSong = {
          category: null,
          title,
          artist,

          imageName,
          imageUrl,

          level_midori: levels[0],
          level_daidai: levels[1],
          level_aka: levels[2],

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

    if ($('.common_next_btn').length > 0) {
      await sleep(500);
      yield* startFetchPage(pageNo + 1);
    }
  }

  yield* startFetchPage();
}

function extractSheets(song: Record<string, any>) {
  return [
    { type: 'std', difficulty: 'midori', level: song.level_midori },
    { type: 'std', difficulty: 'daidai', level: song.level_daidai },
    { type: 'std', difficulty: 'aka', level: song.level_aka },
  ].filter((e) => !!e.level).map((rawSheet) => ({
    songId: song.songId,
    ...rawSheet,
  }));
}

export default async function run() {
  const songs: Record<string, any>[] = [];

  logger.info(`Fetching data from: ${DATA_URL} ...`);
  for await (const pageOfSongs of getPages()) {
    songs.push(...pageOfSongs);
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

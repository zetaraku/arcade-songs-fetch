/* eslint-disable no-await-in-loop */
import axios from 'axios';
import sleep from 'sleep-promise';
import log4js from 'log4js';
import * as cheerio from 'cheerio';
import { hashed, ensureNoDuplicateEntry } from '@/_core/utils';
import { Song, Sheet } from '@@/db/ddr/models';

const logger = log4js.getLogger('ddr/fetch-songs');
logger.level = log4js.levels.INFO;

const VERSION_ID = 'ddra3';

const DATA_URL = 'https://p.eagate.573.jp';
const IMAGE_BASE_URL = 'https://p.eagate.573.jp/';

const versions = [
  { versionId: 0, version: 'DDR 1st' },
  { versionId: 1, version: 'DDR 2ndMIX' },
  { versionId: 2, version: 'DDR 3rdMIX' },
  { versionId: 3, version: 'DDR 4thMIX' },
  { versionId: 4, version: 'DDR 5thMIX' },
  { versionId: 5, version: 'DDRMAX' },
  { versionId: 6, version: 'DDRMAX2' },
  { versionId: 7, version: 'DDR EXTREME' },
  { versionId: 8, version: 'DDR SuperNOVA' },
  { versionId: 9, version: 'DDR SuperNOVA 2' },
  { versionId: 10, version: 'DDR X' },
  { versionId: 11, version: 'DDR X2' },
  { versionId: 12, version: 'DDR X3 VS 2ndMIX' },
  { versionId: 13, version: 'DanceDanceRevolution (2013)' },
  { versionId: 14, version: 'DanceDanceRevolution (2014)' },
  { versionId: 15, version: 'DanceDanceRevolution A' },
  { versionId: 16, version: 'DanceDanceRevolution A20' },
  { versionId: 17, version: 'DanceDanceRevolution A20 PLUS' },
  { versionId: 18, version: 'DanceDanceRevolution A3' },
  //! add further version here !//
];

const categories = [
  { categoryId: 1, category: 'J-POP' },
  { categoryId: 9, category: '洋楽' },
  { categoryId: 2, category: 'アニメ・ゲーム' },
  { categoryId: 8, category: '東方アレンジ' },
  { categoryId: 3, category: 'バラエティ' },
  { categoryId: 7, category: 'ひなビタ♪' },
  { categoryId: 12, category: 'バンめし♪' },
  { categoryId: 11, category: 'ときめきアイドル' },
  //! add further category here !//
] as const;

function getSongId(rawSong: Record<string, any>) {
  return rawSong.title;
}

async function* getCategories() {
  for (const { categoryId, category } of categories) {
    logger.info(`* category '${category}'`);

    const pagePath = `game/ddr/${VERSION_ID}/p/music/index.html`;

    // eslint-disable-next-line no-inner-declarations
    async function* startFetchPage(pageIndex = 0): AsyncGenerator<Record<string, any>[]> {
      logger.info(`- page ${1 + pageIndex}`);

      const response = await axios.get(`${DATA_URL}/${pagePath}`, {
        params: {
          filter: /* genre filter */ 6,
          filtertype: categoryId,
          offset: pageIndex,
        },
      });

      const $ = cheerio.load(response.data);

      const songs = $('#data_tbl tr.data').toArray()
        .map((tr) => {
          const title = $(tr).find('.music_tit').text().trim();
          const artist = $(tr).find('.artist_nam').text().trim();

          const rawSong = {
            category,
            title,
            artist,
          };

          return {
            songId: getSongId(rawSong),
            ...rawSong,
          };
        });

      yield songs;

      if ($('#next').length !== 0) {
        await sleep(500);
        yield* startFetchPage(pageIndex + 1);
      }
    }

    yield* startFetchPage();
  }
}

async function* getPages(versionId: number) {
  const version = versions.find((e) => e.versionId === versionId)?.version;

  logger.info(`* version '${version}'`);

  const pagePath = `game/ddr/${VERSION_ID}/p/music/index.html`;

  async function* startFetchPage(pageIndex = 0): AsyncGenerator<Record<string, any>[]> {
    logger.info(`- page ${1 + pageIndex}`);

    const response = await axios.get(`${DATA_URL}/${pagePath}`, {
      params: {
        filter: /* version filter */ 7,
        filtertype: versionId,
        offset: pageIndex,
      },
    });

    const $ = cheerio.load(response.data);

    const songs = $('#data_tbl tr.data').toArray()
      .map((tr) => {
        const imagePath = $(tr).find('.jk > img').attr('src')!;

        const title = $(tr).find('.music_tit').text().trim();
        const artist = $(tr).find('.artist_nam').text().trim() || null;

        const urlObj = new URL(imagePath, IMAGE_BASE_URL);
        urlObj.searchParams.set('kind', '1'); // use large image

        const imageUrl = urlObj.toString();
        const imageName = `${hashed(imageUrl)}.png`;

        const levels = $(tr).find('.difficult').toArray().map((e) => $(e).text().trim());

        if (levels.length !== 9) {
          throw new Error('The table format has changed.');
        }

        const rawSong = {
          category: null,
          title,
          artist,

          imageName,
          imageUrl,

          level_beginner: levels[0],
          level_basic: levels[1],
          level_difficult: levels[2],
          level_expert: levels[3],
          level_challenge: levels[4],

          dbl_level_basic: levels[5],
          dbl_level_difficult: levels[6],
          dbl_level_expert: levels[7],
          dbl_level_challenge: levels[8],

          version,
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

    if ($('#next').length !== 0) {
      await sleep(500);
      yield* startFetchPage(pageIndex + 1);
    }
  }

  yield* startFetchPage();
}

function injectCategoryInfo(
  songs: Record<string, any>[],
  songCategoryMapping: Map<string, string[]>,
) {
  for (const song of songs) {
    song.category = songCategoryMapping.get(song.songId)?.join('|');
  }
}

function extractSheets(song: Record<string, any>) {
  return [
    { type: 'std', difficulty: 'beginner', level: song.level_beginner },
    { type: 'std', difficulty: 'basic', level: song.level_basic },
    { type: 'std', difficulty: 'difficult', level: song.level_difficult },
    { type: 'std', difficulty: 'expert', level: song.level_expert },
    { type: 'std', difficulty: 'challenge', level: song.level_challenge },
    { type: 'dbl', difficulty: 'basic', level: song.dbl_level_basic },
    { type: 'dbl', difficulty: 'difficult', level: song.dbl_level_difficult },
    { type: 'dbl', difficulty: 'expert', level: song.dbl_level_expert },
    { type: 'dbl', difficulty: 'challenge', level: song.dbl_level_challenge },
  ].filter((e) => e.level !== '-').map((rawSheet) => ({
    songId: song.songId,
    ...rawSheet,
  }));
}

export default async function run() {
  const songs: Record<string, any>[] = [];

  logger.info(`Fetching data from: ${DATA_URL} ...`);
  for (const { versionId } of versions) {
    for await (const pageOfSongs of getPages(versionId)) {
      songs.push(...pageOfSongs);
    }
  }
  logger.info(`OK, ${songs.length} songs fetched.`);

  const songCategoryMapping = new Map<string, string[]>();

  logger.info('Ensuring every song has an unique songId ...');
  ensureNoDuplicateEntry(songs.map((song) => getSongId(song)));

  logger.info(`Fetching category info from: ${DATA_URL} ...`);
  for await (const pageOfSongs of getCategories()) {
    for (const song of pageOfSongs) {
      if (!songCategoryMapping.has(song.songId)) songCategoryMapping.set(song.songId, []);
      songCategoryMapping.get(song.songId)!.push(song.category);
    }
  }
  logger.info(`OK, ${songCategoryMapping.size} category info fetched.`);

  logger.info('Injecting category info into songs ...');
  injectCategoryInfo(songs, songCategoryMapping);

  const sheets = songs.flatMap((song) => extractSheets(song));

  logger.info('Updating songs ...');
  await Promise.all(songs.map((song) => Song.upsert(song)));

  logger.info('Updating sheets ...');
  await Promise.all(sheets.map((sheet) => Sheet.upsert(sheet)));

  logger.info('Done!');
}

if (require.main === module) run();

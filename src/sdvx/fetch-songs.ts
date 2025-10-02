/* eslint-disable no-await-in-loop */
import axios from 'axios';
import sleep from 'sleep-promise';
import log4js from 'log4js';
import * as cheerio from 'cheerio';
import { hashed, ensureNoDuplicateEntry } from '@/_core/utils';
import { Song, Sheet } from '@@/db/sdvx/models';

const logger = log4js.getLogger('sdvx/fetch-songs');
logger.level = log4js.levels.INFO;

const VERSION_ID = 'vi';

const DATA_URL = 'https://p.eagate.573.jp';
const IMAGE_BASE_URL = 'https://p.eagate.573.jp/';

export const difficultyMap = new Map([
  ['nov', 'novice'],
  ['adv', 'advanced'],
  ['exh', 'exhaust'],
  ['mxm', 'maximum'],
  ['inf', 'infinite'],
  ['grv', 'gravity'],
  ['hvn', 'heavenly'],
  ['vvd', 'vivid'],
  ['xcd', 'exceed'],
  ['ult', 'ultimate'],
  //! add further difficulty here !//
]);

function getSongId(rawSong: Record<string, any>) {
  const { title, artist } = rawSong;
  if (title === 'Prayer') {
    if (artist === 'ぺのれり') return 'Prayer';
    if (artist === '溝口ゆうま feat. 大瀬良あい') return 'Prayer (2)';
  }
  if (title === 'カジノファイヤーことみちゃん') {
    if (artist === 'ARM feat. 山本椛 + Brasscapsule') return 'カジノファイヤーことみちゃん';
    if (artist === 'covered by 一条莉々華(ReGLOSS)') return 'カジノファイヤーことみちゃん (2)';
  }
  if (title === '朱と碧のランページ') {
    if (artist === 'NU-KO') return '朱と碧のランページ';
    if (artist === 'covered by 儒烏風亭らでん(ReGLOSS)') return '朱と碧のランページ (2)';
  }
  return title;
}

async function* getSongs() {
  const pagePath = `game/sdvx/${VERSION_ID}/music/index.html`;

  async function* startFetchPage(pageNo = 1): AsyncGenerator<Record<string, any>[]> {
    logger.info(`- page ${pageNo}`);

    const response = await axios.get(`${DATA_URL}/${pagePath}`, {
      params: {
        page: pageNo,
      },
    });

    const $ = cheerio.load(response.data);

    const songs = $('.music').toArray()
      .map((div) => {
        const category = $(div).find('.genre').toArray()
          .map((e) => $(e).text().trim())
          .join('|');

        const title = $(div).find('.inner .info p:nth-child(1)').text().trim();
        const artist = $(div).find('.inner .info p:nth-child(3)').text().trim();

        const imagePath = $(div).find('.jk img').attr('src')!;
        const imageUrl = new URL(imagePath, IMAGE_BASE_URL).toString();
        const imageName = `${hashed(imageUrl)}.png`;

        const rawSong = {
          category,
          title,
          artist,

          imageName,
          imageUrl,

          version: null,
          releaseDate: null,

          isNew: null,
          isLocked: null,

          comment: null,
        };

        const sheets = $(div).find('.inner .level p:not(.none)').toArray()
          .map((e) => {
            const difficultyAbbr = $(e).attr('class')!.trim();
            const difficulty = difficultyMap.get(difficultyAbbr);
            const level = $(e).text().trim();

            if (difficulty === undefined) {
              throw new Error(`'${difficultyAbbr}' cannot be mapped to a valid difficulty.`);
            }

            return {
              type: 'std', difficulty, level,
            };
          });

        return {
          songId: getSongId(rawSong),
          ...rawSong,
          sheets,
        };
      });

    yield songs;

    if (songs.length !== 0) {
      await sleep(500);
      yield* startFetchPage(pageNo + 1);
    }
  }

  yield* startFetchPage();
}

function extractSheets(song: Record<string, any>) {
  return song.sheets.map((rawSheet: Record<string, any>) => ({
    songId: song.songId,
    ...rawSheet,
  }));
}

export default async function run() {
  const songs: Record<string, any>[] = [];

  logger.info(`Fetching data from: ${DATA_URL} ...`);
  for await (const pageOfSongs of getSongs()) {
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

/* eslint-disable no-await-in-loop */
import axios from 'axios';
import sleep from 'sleep-promise';
import log4js from 'log4js';
import * as cheerio from 'cheerio';
import { IntlSheetVersion } from '@@/db/maimai/models';
import { getIntlCookies } from './fetch-intl-sheets';
import { getSongId } from './fetch-versions';
import 'dotenv/config';

const logger = log4js.getLogger('maimai/fetch-intl-versions');
logger.level = log4js.levels.INFO;

const DATA_URL = 'https://maimaidx-eng.com/maimai-mobile/record/musicVersion/search/';

// the default axios 'User-Agent' header must not be present
axios.defaults.headers.common['User-Agent'] = null;

export const versionIdMap = new Map([
  ['maimai', 0],
  ['maimai PLUS', 1],
  ['GreeN', 2],
  ['GreeN PLUS', 3],
  ['ORANGE', 4],
  ['ORANGE PLUS', 5],
  ['PiNK', 6],
  ['PiNK PLUS', 7],
  ['MURASAKi', 8],
  ['MURASAKi PLUS', 9],
  ['MiLK', 10],
  ['MiLK PLUS', 11],
  ['FiNALE', 12],
  ['maimaiでらっくす', 13],
  ['maimaiでらっくす PLUS', 14],
  ['Splash', 15],
  ['Splash PLUS', 16],
  ['UNiVERSE', 17],
  ['UNiVERSE PLUS', 18],
  ['FESTiVAL', 19],
  ['FESTiVAL PLUS', 20],
  ['BUDDiES', 21],
  ['BUDDiES PLUS', 22],
  ['PRiSM', 23],
  ['PRiSM PLUS', 24],
  // ['CiRCLE', 25],
  //! add further version here !//
]);

const difficultyIdMap = new Map([
  ['basic', 0],
  ['advanced', 1],
  ['expert', 2],
  ['master', 3],
  ['remaster', 4],
]);

async function getIntlSheets(
  version: string,
  difficulty: string,
  cookies: Record<string, string>,
) {
  const versionId = versionIdMap.get(version);
  const difficultyId = difficultyIdMap.get(difficulty);

  const response = await axios.get(DATA_URL, {
    headers: {
      Cookie: `userId=${cookies.userId};`,
    },
    params: {
      version: versionId,
      diff: difficultyId,
    },
  });

  const $ = cheerio.load(response.data);

  if ($(':contains("ERROR CODE")').length > 0) {
    throw new Error('An error occurred while fetching the page.');
  }

  const sheetBlockSelector = `.music_${difficulty}_score_back`;
  const sheetBlocks = $(sheetBlockSelector).toArray();

  return sheetBlocks.map((e) => {
    const title = $(e).find('.music_name_block').text()/* .trim() */;

    const type = (() => {
      const typeButton = $(e).find(`.music_kind_icon, .music_${difficulty}_btn_on`);

      if (typeButton.attr('src')!.endsWith('music_dx.png')) return 'dx';
      if (typeButton.attr('src')!.endsWith('music_standard.png')) return 'std';

      throw new Error('Unknown sheet type');
    })();

    return {
      songId: getSongId(title, version),
      type,
      version,
    };
  });
}

export default async function run() {
  logger.info('Logging in to get the required cookies ...');
  const cookies = await getIntlCookies();

  if (!cookies.userId) {
    throw new Error('Failed to get the required cookies. (Login Failed)');
  }

  const intlSheets: Record<string, any>[] = [];

  logger.info(`Fetching data from: ${DATA_URL} ...`);
  for (const version of versionIdMap.keys()) {
    logger.info(`* version '${version}'`);

    intlSheets.push(...await getIntlSheets(version, 'basic', cookies));

    await sleep(500);
  }
  logger.info(`OK, ${intlSheets.length} sheets fetched.`);

  logger.info('Truncating and Inserting intlSheetVersions ...');
  await IntlSheetVersion.truncate();
  await IntlSheetVersion.bulkCreate(intlSheets);

  logger.info('Done!');
}

if (require.main === module) run();

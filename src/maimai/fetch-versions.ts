/* eslint-disable no-await-in-loop */
import fs from 'fs';
import https from 'https';
import axios from 'axios';
import puppeteer from 'puppeteer';
import sleep from 'sleep-promise';
import log4js from 'log4js';
import * as cheerio from 'cheerio';
import { SheetVersion } from './models';
import 'dotenv/config';

const logger = log4js.getLogger('maimai/fetch-versions');
logger.level = log4js.levels.INFO;

// fix missing certificate
https.globalAgent.options.ca = fs.readFileSync('node_modules/node_extra_ca_certs_mozilla_bundle/ca_bundle/ca_intermediate_root_bundle.pem');

const DATA_URL = 'https://maimaidx.jp/maimai-mobile/record/musicVersion/search/';

const versionIdMap = new Map([
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
  //! add further version here !//
]);

const difficultyIdMap = new Map([
  ['basic', 0],
  // ['advanced', 1],
  // ['expert', 2],
  // ['master', 3],
  // ['remaster', 4],
]);

function getSongId(title: string, version: string) {
  if (title === 'Link' && version === 'ORANGE') {
    return 'Link (2)';
  }
  return title;
}

async function getJpCookies() {
  if (!process.env.MAIMAI_JP_SEGA_ID || !process.env.MAIMAI_JP_SEGA_PASSWORD) {
    throw new Error('Please set your MAIMAI_JP_SEGA_ID and MAIMAI_JP_SEGA_PASSWORD in the .env file');
  }

  const browser = await puppeteer.launch();

  const page = await browser.newPage();
  await page.goto('https://maimaidx.jp/maimai-mobile/');

  await page.type('input[name="segaId"]', process.env.MAIMAI_JP_SEGA_ID);
  await page.type('input[name="password"]', process.env.MAIMAI_JP_SEGA_PASSWORD);

  await Promise.all([
    page.waitForNavigation(),
    page.click('form[action="https://maimaidx.jp/maimai-mobile/submit/"] button[type="submit"]'),
  ]);

  await Promise.all([
    page.waitForNavigation(),
    page.click('form[action="https://maimaidx.jp/maimai-mobile/aimeList/submit/"] button[type="submit"]'),
  ]);

  const cookies = await page.cookies();

  await browser.close();

  return Object.fromEntries(cookies.map((cookie) => [cookie.name, cookie.value]));
}

async function getJpSheets(
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

  const sheetBlocks = $(`.music_${difficulty}_score_back`).toArray();
  const sheets = sheetBlocks.map((e) => {
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

  return sheets;
}

export default async function run() {
  logger.info('Logging in to get the required cookies ...');
  const cookies = await getJpCookies();

  if (!cookies.userId) {
    throw new Error('Failed to get the required cookies. (Login Failed)');
  }

  const jpSheets: Record<string, any>[] = [];

  logger.info(`Fetching data from: ${DATA_URL} ...`);
  for (const version of versionIdMap.keys()) {
    logger.info(`* version '${version}'`);

    jpSheets.push(...await getJpSheets(version, 'basic', cookies));

    await sleep(500);
  }
  logger.info(`OK, ${jpSheets.length} sheets fetched.`);

  logger.info('Preparing SheetVersions table ...');
  await SheetVersion.sync();

  logger.info('Updating sheet versions ...');
  await Promise.all(jpSheets.map((jpSheet) => SheetVersion.upsert(jpSheet)));

  logger.info('Done!');
}

if (require.main === module) run();

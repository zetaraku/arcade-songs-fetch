/* eslint-disable no-underscore-dangle */
/* eslint-disable no-await-in-loop */
import { URLSearchParams } from 'node:url';
import axios from 'axios';
import puppeteer from 'puppeteer';
import sleep from 'sleep-promise';
import log4js from 'log4js';
import * as cheerio from 'cheerio';
import { IntlSheet } from '@@/db/chunithm/models';
import { ensureNoDuplicateEntry } from '@/_core/utils';
import { getSongId } from './fetch-songs';
import 'dotenv/config';

const logger = log4js.getLogger('chunithm/fetch-intl-sheets');
logger.level = log4js.levels.INFO;

const DATA_URL = 'https://chunithm-net-eng.com/mobile/record';

const categoryIdMap = new Map([
  ['POPS & ANIME', 0],
  ['niconico', 2],
  ['東方Project', 3],
  ['VARIETY', 6],
  ['イロドリミドリ', 7],
  ['ゲキマイ', 9],
  ['ORIGINAL', 5],
  //! add further category here !//
]);

const difficultyApiMap = new Map([
  ['basic', 'sendBasic'],
  ['advanced', 'sendAdvanced'],
  ['expert', 'sendExpert'],
  ['master', 'sendMaster'],
  ['ultima', 'sendUltima'],
]);

const worldsEndTypeMappings = [
  '　',
  '招', '狂', '止', '改', '両',
  '嘘', '半', '時', '光', '割',
  '跳', '弾', '戻', '分', '布',
  '敷', '翔', '謎', '？', '！',
  '避', '速', '歌', '撃', '舞',
  '俺', '蔵', '覚',
  //! add further type here !//
];

async function getIntlCookies() {
  if (!process.env.CHUNITHM_INTL_SEGA_ID || !process.env.CHUNITHM_INTL_SEGA_PASSWORD) {
    throw new Error('Please set your CHUNITHM_INTL_SEGA_ID and CHUNITHM_INTL_SEGA_PASSWORD in the .env file');
  }

  const browser = await puppeteer.launch();

  const url = new URL('https://lng-tgk-aime-gw.am-all.net/common_auth/login');
  url.searchParams.set('site_id', 'chuniex');
  url.searchParams.set('redirect_url', 'https://chunithm-net-eng.com/mobile/');

  const page = await browser.newPage();
  await page.goto(url.toString());

  await page.click('#agree');
  await page.click('.c-button--openid--segaId');
  await page.type('#sid', process.env.CHUNITHM_INTL_SEGA_ID);
  await page.type('#password', process.env.CHUNITHM_INTL_SEGA_PASSWORD);

  await Promise.all([
    page.waitForNavigation(),
    page.click('#btnSubmit'),
  ]);

  const cookies = await page.cookies();

  await browser.close();

  return Object.fromEntries(cookies.map((cookie) => [cookie.name, cookie.value]));
}

async function getIntlSheets(
  category: string,
  difficulty: string,
  cookies: Record<string, string>,
) {
  const categoryId = categoryIdMap.get(category);
  const difficultyApi = difficultyApiMap.get(difficulty);

  // request to change the category
  await axios.post(`${DATA_URL}/musicGenre/${difficultyApi}`, new URLSearchParams({
    genre: String(categoryId),
    token: cookies._t,
  }), {
    headers: {
      Cookie: `userId=${cookies.userId}; _t=${cookies._t};`,
    },
  });

  const response = await axios.get(
    `${DATA_URL}/musicGenre/${difficulty}`,
    {
      headers: {
        Cookie: `userId=${cookies.userId}; _t=${cookies._t};`,
      },
    },
  );

  const $ = cheerio.load(response.data);

  if ($(':contains("Error Code")').length > 0) {
    throw new Error('An error occurred while fetching the page.');
  }

  const sheetBlocks = $('.musiclist_box').toArray();

  return sheetBlocks.map((e) => {
    const title = $(e).find('.music_title').text().trim();
    const id = $(e).find('input[name="idx"]').val();

    return {
      songId: getSongId({ catname: category, title, id }),
      type: 'std',
      difficulty,
    };
  });
}

async function getIntlWorldsEndSheets(cookies: Record<string, string>) {
  const response = await axios.get(
    `${DATA_URL}/worldsEndList/`,
    {
      headers: {
        Cookie: `userId=${cookies.userId}; _t=${cookies._t};`,
      },
    },
  );

  const $ = cheerio.load(response.data);

  const sheetBlocks = $('.musiclist_box').toArray();

  return sheetBlocks.map((e) => {
    const title = $(e).find('.musiclist_worldsend_title').text().trim();
    const id = $(e).siblings('input[name="idx"]').val();
    // Note: Unlike normal songs, the id of WORLD'S END songs is placed outside of the music box!

    const weTypeId = $(e).find('.musiclist_worldsend_icon img').attr('src')!
      .match(/^https:\/\/chunithm-net-eng.com\/mobile\/images\/icon_we_(\d+).png/)![1];
    const weType = worldsEndTypeMappings[Number(weTypeId)];

    // const weStarId = $(e).find('.musiclist_worldsend_star img').attr('src')!
    //   .match(/^https:\/\/chunithm-net-eng.com\/mobile\/images\/icon_we_star(\d+).png/)![1];
    // const weStar = '☆'.repeat((Number(weStarId) + 1) / 2);

    return {
      songId: getSongId({ catname: 'WORLD\'S END', title, id }),
      type: 'we',
      difficulty: `【${weType}】`,
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
  for (const category of categoryIdMap.keys()) {
    logger.info(`* category '${category}'`);

    for (const difficulty of difficultyApiMap.keys()) {
      logger.info(`- difficulty '${difficulty}'`);

      intlSheets.push(...await getIntlSheets(category, difficulty, cookies));

      await sleep(500);
    }
  }

  logger.info('Fetching WORLD\'S END sheets ...');
  intlSheets.push(...await getIntlWorldsEndSheets(cookies));

  logger.info(`OK, ${intlSheets.length} sheets fetched.`);

  logger.info('Ensuring every sheet has an unique sheetExpr ...');
  ensureNoDuplicateEntry(intlSheets.map((sheet) => [sheet.songId, sheet.type, sheet.difficulty].join('|')));

  logger.info('Truncating and Inserting intlSheets ...');
  await IntlSheet.truncate();
  await IntlSheet.bulkCreate(intlSheets);

  logger.info('Done!');
}

if (require.main === module) run();

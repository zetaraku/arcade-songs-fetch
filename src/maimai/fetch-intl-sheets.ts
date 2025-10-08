/* eslint-disable no-await-in-loop */
import axios from 'axios';
import puppeteer from 'puppeteer';
import sleep from 'sleep-promise';
import log4js from 'log4js';
import * as cheerio from 'cheerio';
import { IntlSheet } from '@@/db/maimai/models';
import { ensureNoDuplicateEntry } from '@/_core/utils';
import 'dotenv/config';

const logger = log4js.getLogger('maimai/fetch-intl-sheets');
logger.level = log4js.levels.INFO;

const DATA_URL = 'https://maimaidx-eng.com/maimai-mobile/record/musicGenre/search/';

// the default axios 'User-Agent' header must not be present
axios.defaults.headers.common['User-Agent'] = null;

const categoryIdMap = new Map([
  ['POPS＆アニメ', 101],
  ['niconico＆ボーカロイド', 102],
  ['東方Project', 103],
  ['ゲーム＆バラエティ', 104],
  ['maimai', 105],
  ['オンゲキ＆CHUNITHM', 106],
  //! add further category here !//
]);

const difficultyIdMap = new Map([
  ['basic', 0],
  ['advanced', 1],
  ['expert', 2],
  ['master', 3],
  ['remaster', 4],
]);

function getSongId(title: string, category: string) {
  if (title === 'Link') {
    if (category === 'maimai') return 'Link';
    if (category === 'niconico＆ボーカロイド') return 'Link (2)';
  }
  return title;
}

export async function getIntlCookies() {
  if (!process.env.MAIMAI_INTL_SEGA_ID || !process.env.MAIMAI_INTL_SEGA_PASSWORD) {
    throw new Error('Please set your MAIMAI_INTL_SEGA_ID and MAIMAI_INTL_SEGA_PASSWORD in the .env file');
  }

  if (!process.env.USER_AGENT) {
    throw new Error('Please set a valid USER_AGENT in the .env file');
  }

  const browser = await puppeteer.launch();

  const url = new URL('https://lng-tgk-aime-gw.am-all.net/common_auth/login');
  url.searchParams.set('site_id', 'maimaidxex');
  url.searchParams.set('redirect_url', 'https://maimaidx-eng.com/maimai-mobile/');

  const page = await browser.newPage();
  await page.setUserAgent(process.env.USER_AGENT);

  await page.goto(url.toString());

  await page.click('#agree-maimaidxex #agree');
  await page.click('.c-button--openid--segaId');
  await page.type('#sid', process.env.MAIMAI_INTL_SEGA_ID);
  await page.type('#password', process.env.MAIMAI_INTL_SEGA_PASSWORD);

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
  const difficultyId = difficultyIdMap.get(difficulty);

  const response = await axios.get(DATA_URL, {
    headers: {
      Cookie: `userId=${cookies.userId};`,
    },
    params: {
      genre: categoryId,
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
      const typeButton = $(e).siblings(`.music_kind_icon, .music_${difficulty}_btn_on`);

      if (typeButton.attr('src')!.endsWith('music_dx.png')) return 'dx';
      if (typeButton.attr('src')!.endsWith('music_standard.png')) return 'std';

      throw new Error('Unknown sheet type');
    })();

    const level = $(e).find('.music_lv_block').text().trim();

    return {
      songId: getSongId(title, category),
      type,
      difficulty,
      level,
    };
  });
}

async function getIntlUtageSheets(
  cookies: Record<string, string>,
) {
  const response = await axios.get(DATA_URL, {
    headers: {
      Cookie: `userId=${cookies.userId};`,
    },
    params: {
      genre: 99,
      diff: 10,
    },
  });

  const $ = cheerio.load(response.data);

  if ($(':contains("ERROR CODE")').length > 0) {
    throw new Error('An error occurred while fetching the page.');
  }

  const sheetBlocks = $('.music_utage_score_back').toArray();

  return sheetBlocks.map((e) => {
    let title = $(e).find('.music_name_block').text()/* .trim() */;

    let utageType = $(e).find('.music_kind_icon_utage_text').eq(0).text();

    const level = $(e).find('.music_lv_block').text().trim();

    //! hotfix
    if (title === '[宴]人マニア') {
      title = '[X]人マニア';
      utageType = 'X';
    }

    return {
      songId: getSongId(title, '宴会場'),
      type: 'utage',
      difficulty: `【${utageType}】`,
      level,
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

    for (const difficulty of difficultyIdMap.keys()) {
      logger.info(`- difficulty '${difficulty}'`);

      intlSheets.push(...await getIntlSheets(category, difficulty, cookies));

      await sleep(500);
    }
  }
  try {
    logger.info("* category '宴会場'");
    intlSheets.push(...await getIntlUtageSheets(cookies));
  } catch {
    logger.info("* category '宴会場' is not available.");
  }
  logger.info(`OK, ${intlSheets.length} sheets fetched.`);

  logger.info('Ensuring every sheet has an unique sheetExpr ...');
  ensureNoDuplicateEntry(intlSheets.map((sheet) => [sheet.songId, sheet.type, sheet.difficulty].join('|')));

  logger.info('Truncating and Inserting intlSheets ...');
  await IntlSheet.truncate();
  await IntlSheet.bulkCreate(intlSheets);

  logger.info('Done!');
}

if (require.main === module) run();

/* eslint-disable no-await-in-loop */
import axios from 'axios';
import puppeteer from 'puppeteer';
import sleep from 'sleep-promise';
import log4js from 'log4js';
import * as cheerio from 'cheerio';
import { hashed, ensureNoDuplicateEntry } from '@/_core/utils';
import { Song, Sheet } from '@@/db/diva/models';
import 'dotenv/config';

const logger = log4js.getLogger('diva/fetch-songs');
logger.level = log4js.levels.INFO;

const DATA_URL = 'https://project-diva-ac.net';
const IMAGE_BASE_URL = 'https://project-diva-ac.net/';

function getSongId(songInfo: Record<string, any>) {
  return songInfo.title;
}

export async function getCookies() {
  if (!process.env.DIVA_JP_SEGA_ID || !process.env.DIVA_JP_SEGA_PASSWORD) {
    throw new Error('Please set your DIVA_JP_SEGA_ID and DIVA_JP_SEGA_PASSWORD in the .env file');
  }

  const browser = await puppeteer.launch();

  const page = await browser.newPage();
  await page.goto('https://project-diva-ac.net/divanet/');

  await page.type('[name=accessCode]', process.env.DIVA_JP_SEGA_ID);
  await page.type('[name=password]', process.env.DIVA_JP_SEGA_PASSWORD);

  await Promise.all([
    page.waitForNavigation(),
    page.click('#submit'),
  ]);

  const cookies = await page.cookies();

  await browser.close();

  return Object.fromEntries(cookies.map((cookie) => [cookie.name, cookie.value]));
}

async function* fetchPages(cookies: Record<string, string>) {
  async function* startFetchPage(pageNo = 0): AsyncGenerator<Record<string, any>[]> {
    logger.info(`- page ${pageNo}`);

    const response = await axios.get(`${DATA_URL}/divanet/pv/sort/0/false/${pageNo}`, {
      headers: {
        Cookie: `JSESSIONID=${cookies.JSESSIONID};`,
      },
    });

    const $ = cheerio.load(response.data);

    const songInfos = $('a[href^="/divanet/pv/info/"]').toArray()
      .map((e) => {
        // const id = $(e).attr('href')!.match(/^\/divanet\/pv\/info\/(\w+)\//)![1];
        const title = $(e).text().trim();
        const detailUrl = new URL($(e).attr('href')!, DATA_URL).toString();

        const rawSongInfo = {
          title,
          detailUrl,
        };

        return {
          songId: getSongId(rawSongInfo),
          ...rawSongInfo,
        };
      });

    yield songInfos;

    if ($('a:contains("次へ[#]")').length > 0) {
      await sleep(500);
      yield* startFetchPage(pageNo + 1);
    }
  }

  yield* startFetchPage();
}

async function fetchSong(songInfo: Record<string, any>, cookies: Record<string, string>) {
  const response = await axios.get(songInfo.detailUrl, {
    headers: {
      Cookie: `JSESSIONID=${cookies.JSESSIONID};`,
    },
  });

  const $ = cheerio.load(response.data);

  if ($(':contains("データ保護のためDIVA.NETサーバへの接続を終了します。")').length !== 0) {
    throw new Error('Login expired. Please run again to continue.');
  }

  const artist = $('center:nth-of-type(3) > table:last-of-type > tbody > tr:nth-child(1) > td:nth-child(2)').text().trim();

  const imagePath = $('img[src^="/divanet/img/pv/"]').attr('src')!;
  const imageUrl = new URL(imagePath, IMAGE_BASE_URL).toString();
  const imageName = `${hashed(imageUrl)}.png`;

  const sheets = new Map(
    $('center:nth-of-type(3) > table:not(:last-of-type) > tbody > tr:nth-child(1) > td:nth-child(1)').toArray()
      .map((e) => {
        const nodes = $(e).find('font').contents().toArray();

        const difficulty = $(nodes[0]).text().trim();
        const level = $(nodes[2]).text().trim().replace('★', '');

        return [difficulty, level];
      }),
  );

  return {
    songId: songInfo.songId,

    category: null,
    title: songInfo.title,
    artist,

    imageUrl,
    imageName,

    level_easy: sheets.get('EASY'),
    level_normal: sheets.get('NORMAL'),
    level_hard: sheets.get('HARD'),
    level_extreme: sheets.get('EXTREME'),
    level_ex_extreme: sheets.get('EX EXTREME'),

    version: null,
    releaseDate: null,

    isNew: null,
    isLocked: null,
  };
}

function extractSheets(song: Record<string, any>) {
  return [
    { type: 'std', difficulty: 'easy', level: song.level_easy },
    { type: 'std', difficulty: 'normal', level: song.level_normal },
    { type: 'std', difficulty: 'hard', level: song.level_hard },
    { type: 'std', difficulty: 'extreme', level: song.level_extreme },
    { type: 'std', difficulty: 'ex_extreme', level: song.level_ex_extreme },
  ].filter((e) => !!e.level).map((rawSheet) => ({
    songId: song.songId,
    ...rawSheet,
  }));
}

export default async function run() {
  logger.info('Logging in to get the required cookies ...');
  const cookies = await getCookies();

  if (!cookies.JSESSIONID) {
    throw new Error('Failed to get the required cookies. (Login Failed)');
  }

  logger.info(`Fetching song list from: ${DATA_URL} ...`);
  const songInfos: Record<string, any>[] = [];
  for await (const pageOfSongs of fetchPages(cookies)) {
    songInfos.push(...pageOfSongs);
  }

  logger.info('Ensuring every song has an unique songId ...');
  ensureNoDuplicateEntry(songInfos.map((songInfo) => getSongId(songInfo)));

  const existedSongs = await Song.findAll<any>();
  const songsToFetch = songInfos.filter(
    (songInfo) => !existedSongs.some((song) => song.songId === songInfo.songId),
  );
  logger.info(`Found ${songsToFetch.length} page(s) to fetch.`);

  for (const [index, songInfo] of songsToFetch.entries()) {
    try {
      logger.info(`(${1 + index} / ${songsToFetch.length}) Updating song & sheets for: ${songInfo.title} ...`);
      const song = await fetchSong(songInfo, cookies);
      const sheets = extractSheets(song);

      await Song.upsert(song);
      await Promise.all(sheets.map((sheet) => Sheet.upsert(sheet)));
    } catch (e) {
      logger.error(e);
      break;
    } finally {
      await sleep(500);
    }
  }

  logger.info('Done!');
}

if (require.main === module) run();

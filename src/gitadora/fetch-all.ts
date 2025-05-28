/* eslint-disable no-nested-ternary */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-continue */
import fs from 'node:fs';
import childProcess from 'node:child_process';
import axios from 'axios';
import download from 'download';
import cwebpBinPath from 'cwebp-bin';
import sleep from 'sleep-promise';
import log4js from 'log4js';
import * as cheerio from 'cheerio';
import { hashed, ensureNoDuplicateEntry } from '@/_core/utils';
import { Song, Sheet } from '@@/db/gitadora/models';
import 'dotenv/config';

const logger = log4js.getLogger('gitadora/fetch-all');
logger.level = log4js.levels.INFO;

const VERSION_ID = 'gitadora_galaxywave_delta';

const DATA_URL = 'https://p.eagate.573.jp';
const IMAGE_BASE_URL = 'https://p.eagate.573.jp/';

function getSongId(songInfo: Record<string, any>) {
  return songInfo.title;
}

export async function getCookies() {
  if (process.env.GITADORA_JP_KONAMI_SESSION_TOKEN) {
    return { M573SSID: process.env.GITADORA_JP_KONAMI_SESSION_TOKEN };
  }

  throw new Error('Please set your GITADORA_JP_KONAMI_SESSION_TOKEN in the .env file');
}

async function fetchSongInfos(gameType: 'gf' | 'dm', categoryNo: number, cookies: Record<string, string>) {
  const response = await axios.get(`${DATA_URL}/game/gfdm/${VERSION_ID}/p/playdata/music.html`, {
    headers: {
      Cookie: `M573SSID=${cookies.M573SSID};`,
    },
    params: {
      cat: String(categoryNo),
      gtype: gameType,
    },
  });

  const $ = cheerio.load(response.data);

  if ($(':contains("このページのご利用にはe-amusementへのログインが必要です。")').length !== 0) {
    throw new Error('Login expired. Please run again to continue.');
  }

  const songInfos = $('table.music_table_tb .music_cell').toArray()
    .map((musicCell) => {
      const title = $(musicCell).find('.title_box a.text_link').text().trim();

      /**
       * This URL is "transient", which means that the page it points to may
       * change or be invalidated upon page navigation or song list changes.
       * In this case, it may change when you visit a page with a different gameType.
       */
      const transientDetailUrl = new URL($(musicCell).find('.title_box a.text_link').attr('href')!, DATA_URL).toString();

      return {
        songId: getSongId({ title }),
        title,
        gameType,
        transientDetailUrl,
      };
    });

  if (songInfos.length === 0) {
    logger.warn('No songs found on this page. The login may have already expired.');
  }

  return songInfos;
}

async function fetchSong(songInfo: Record<string, any>, cookies: Record<string, string>) {
  const response = await axios.get(songInfo.transientDetailUrl, {
    headers: {
      Cookie: `M573SSID=${cookies.M573SSID};`,
    },
  });

  const $ = cheerio.load(response.data);

  if ($(':contains("このページのご利用にはe-amusementへのログインが必要です。")').length !== 0) {
    throw new Error('Login expired. Please run again to continue.');
  }

  const title = $('.live_title').text().trim();

  if (title !== songInfo.title) {
    throw new Error(`Title mismatch detected. The song list may already changed. (old: ${songInfo.title}, new: ${title})`);
  }

  /**
   * This URL is "transient", which means that the page it points to may
   * change or be invalidated upon page navigation or song list changes.
   * In this case, it will change or be invalidated when you visit another detail page.
   */
  const transientImageUrl = new URL($('img.music_jacket').attr('src')!, IMAGE_BASE_URL).toString();
  const fixedImageName = `${hashed(songInfo.songId)}.png`;

  const sheetsOfSong = [];

  let currentType = null;

  if (songInfo.gameType === 'dm') {
    currentType = 'drum';
  }

  for (const el of $('.md_part_GUITAR, .md_part_BASS, .md_list_contents')) {
    if ($(el).hasClass('md_part_GUITAR')) {
      currentType = 'guitar';
      continue;
    }
    if ($(el).hasClass('md_part_BASS')) {
      currentType = 'bass';
      continue;
    }

    if (currentType == null) {
      throw new Error('Unknown sheet type');
    }

    const difficulty = (() => {
      const difficultyTh = $(el).find('table.music_detail > thead > tr > th');

      if (difficultyTh.hasClass('diff_BASIC')) return 'basic';
      if (difficultyTh.hasClass('diff_ADVANCED')) return 'advanced';
      if (difficultyTh.hasClass('diff_EXTREME')) return 'extreme';
      if (difficultyTh.hasClass('diff_MASTER')) return 'master';

      throw new Error('Unknown sheet difficulty');
    })();
    const level = $(el).find('.diff_area').text().trim();

    sheetsOfSong.push({
      songId: songInfo.songId,
      type: currentType,
      difficulty,
      level,
    });
  }

  return {
    songId: songInfo.songId,

    category: null,
    title: songInfo.title,
    artist: null,

    imageUrl: null,
    imageName: fixedImageName,

    version: null,
    releaseDate: null,

    isNew: null,
    isLocked: null,

    comment: null,

    sheets: sheetsOfSong,
    transientImageUrl,
  };
}

async function fetchSongs(gameType: 'gf' | 'dm', cookies: Record<string, string>, forceRefetch: boolean = false) {
  const songInfos: Record<string, any>[] = [];

  for (let categoryNo = 0; categoryNo <= 36; categoryNo += 1) {
    logger.info(`- category ${categoryNo}`);

    songInfos.push(...await fetchSongInfos(gameType, categoryNo, cookies));

    await sleep(250);
  }

  logger.info('Ensuring every song has an unique songId ...');
  ensureNoDuplicateEntry(songInfos.map((songInfo) => songInfo.songId));

  const coverImgDir = 'dist/gitadora/img/cover';
  const coverImgWebpDir = 'dist/gitadora/img/cover-m';
  fs.mkdirSync(coverImgDir, { recursive: true });
  fs.mkdirSync(coverImgWebpDir, { recursive: true });

  for (const [index, songInfo] of songInfos.entries()) {
    if (!forceRefetch) {
      const existSong = await Song.findOne({
        where: {
          songId: songInfo.songId,
        },
      });
      const existSheets = await Sheet.findAll({
        where: {
          songId: songInfo.songId,
          type:
            songInfo.gameType === 'gf' ? ['guitar', 'bass']
              : songInfo.gameType === 'dm' ? ['drum']
                : undefined,
        },
      });

      // skip if the song and "some" sheets already exist in database
      if (existSong != null && existSheets.length > 0) continue;
    }

    logger.info(`(${1 + index} / ${songInfos.length}) Fetching data & image: ${songInfo.title} ...`);

    // logger.info('Fetching song & sheet data ...');
    const song = await fetchSong(songInfo, cookies);

    // logger.info('Downloading & converting cover image ...');
    if (song.imageName && !fs.existsSync(`${coverImgDir}/${song.imageName}`)) {
      await download(song.transientImageUrl, coverImgDir, { filename: song.imageName, headers: { Cookie: `M573SSID=${cookies.M573SSID};` } });
      await sleep(100);
    }
    if (song.imageName && !fs.existsSync(`${coverImgWebpDir}/${song.imageName}`)) {
      childProcess.execFileSync(cwebpBinPath, [`${coverImgDir}/${song.imageName}`, '-o', `${coverImgWebpDir}/${song.imageName}`, '-quiet']);
    }

    // logger.info('Updating song ...');
    await Song.upsert(song);

    // logger.info('Updating sheets ...');
    await Promise.all(song.sheets.map((sheet) => Sheet.upsert(sheet)));

    await sleep(250);
  }
}

export default async function run() {
  logger.info('Logging in to get the required cookies ...');
  const cookies = await getCookies();

  if (!cookies.M573SSID) {
    throw new Error('Failed to get the required cookies. (Login Failed)');
  }

  // set this to true to refetch possibly newly-added sheets for already fetched songs
  const forceRefetch = false;

  logger.info('Fetching GF data ...');
  await fetchSongs('gf', cookies, forceRefetch);

  logger.info('Fetching DM data ...');
  await fetchSongs('dm', cookies, forceRefetch);

  logger.info('Done!');
}

if (require.main === module) run();

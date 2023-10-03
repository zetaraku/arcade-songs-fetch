import { URLSearchParams } from 'node:url';
import axios from 'axios';
import log4js from 'log4js';
import { hashed, ensureNoDuplicateEntry } from '@/_core/utils';
import { Song, Sheet } from '@@/db/nostalgia/models';
import 'dotenv/config';

const logger = log4js.getLogger('nostalgia/fetch-songs');
logger.level = log4js.levels.INFO;

const VERSION_ID = 'op3';

const DATA_URL = `https://p.eagate.573.jp/game/nostalgia/${VERSION_ID}/json/pdata_getdata.html`;
const IMAGE_BASE_URL = `https://p.eagate.573.jp/game/nostalgia/${VERSION_ID}/img/jacket.html`;

const difficultyMap = new Map([
  ['Normal', 'normal'],
  ['Hard', 'hard'],
  ['Expert', 'expert'],
  ['Real', 'real'],
]);

function getSongId(rawSong: Record<string, any>) {
  const { title, artist } = rawSong;
  if (title === 'トルコ行進曲') {
    if (artist === 'モーツァルト') return 'トルコ行進曲';
    if (artist === 'ベートーヴェン') return 'トルコ行進曲 (2)';
  }
  return title;
}

export async function getCookies() {
  if (process.env.NOSTALGIA_JP_KONAMI_SESSION_TOKEN) {
    return { M573SSID: process.env.NOSTALGIA_JP_KONAMI_SESSION_TOKEN };
  }

  throw new Error('Please set your NOSTALGIA_JP_KONAMI_SESSION_TOKEN in the .env file');
}

function extractSong(rawSong: Record<string, any>) {
  const id = rawSong['@index'];

  const imageUrl = `${IMAGE_BASE_URL}?c=${id}`;
  const imageName = `${hashed(imageUrl)}.png`;

  return {
    songId: getSongId(rawSong),

    category: rawSong.category,
    title: rawSong.title,
    artist: rawSong.artist || null,

    imageName,
    imageUrl,

    version: null,
    releaseDate: null,

    isNew: null,
    isLocked: rawSong.unlock_type > 1,
  };
}

function extractSheets(rawSong: Record<string, any>) {
  return rawSong.sheet.map((sheet: Record<string, any>) => {
    const isReal = sheet.difficulty === 'Real';

    return {
      songId: getSongId(rawSong),
      type: 'std',
      difficulty: difficultyMap.get(sheet.difficulty),
      level: isReal ? `◆${sheet.level}` : String(sheet.level),
    };
  });
}

export default async function run() {
  logger.info('Logging in to get the required cookies ...');
  const cookies = await getCookies();

  if (!cookies.M573SSID) {
    throw new Error('Failed to get the required cookies. (Login Failed)');
  }

  logger.info(`Fetching data from: ${DATA_URL} ...`);
  const response = await axios.post(DATA_URL, new URLSearchParams({
    service_kind: 'music_data',
    pdata_kind: 'music_data',
  }), {
    headers: {
      Cookie: `M573SSID=${cookies.M573SSID};`,
    },
  });

  const rawSongs: Record<string, any>[] = response.data.data.music;
  logger.info(`OK, ${rawSongs.length} songs fetched.`);

  logger.info('Ensuring every song has an unique songId ...');
  ensureNoDuplicateEntry(rawSongs.map((rawSong) => getSongId(rawSong)));

  const songs = rawSongs.map((rawSong) => extractSong(rawSong));
  const sheets = rawSongs.flatMap((rawSong) => extractSheets(rawSong));

  logger.info('Updating songs ...');
  await Promise.all(songs.map((song) => Song.upsert(song)));

  logger.info('Updating sheets ...');
  await Promise.all(sheets.map((sheet) => Sheet.upsert(sheet)));

  logger.info('Done!');
}

if (require.main === module) run();

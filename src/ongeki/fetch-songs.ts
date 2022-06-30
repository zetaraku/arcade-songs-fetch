import axios from 'axios';
import log4js from 'log4js';
import { hashed, ensureNoDuplicateEntry } from '@/core/utils';
import { Song, Sheet } from '@@/db/ongeki/models';

const logger = log4js.getLogger('ongeki/fetch-songs');
logger.level = log4js.levels.INFO;

const DATA_URL = 'https://ongeki.sega.jp/assets/json/music/music.json';
const IMAGE_BASE_URL = 'https://ongeki-net.com/ongeki-mobile/img/music/';

function getSongId(rawSong: Record<string, any>) {
  if (rawSong.category === 'LUNATIC') {
    return `(LUN) ${rawSong.title}`;
  }
  if (rawSong.title === 'Singularity' && rawSong.id === '402400') {
    return 'Singularity (2)';
  }
  if (rawSong.title === 'Singularity' && rawSong.id === '403700') {
    return 'Singularity (3)';
  }
  return rawSong.title;
}

function preprocessRawSongs(rawSongs: Record<string, any>[]) {
  for (const rawSong of rawSongs) {
    if (rawSong.lunatic) {
      rawSong.category = 'LUNATIC';
    } else if (rawSong.bonus) {
      rawSong.category = 'ボーナストラック';
    }
  }
}

function extractSong(rawSong: Record<string, any>) {
  const imageUrl = new URL(rawSong.image_url, IMAGE_BASE_URL).toString();
  const imageName = `${hashed(imageUrl)}.png`;

  return {
    songId: getSongId(rawSong),

    category: rawSong.category,
    title: rawSong.title,
    artist: rawSong.artist,

    imageName,
    imageUrl,

    version: null,
    releaseDate: rawSong.date ? `${
      rawSong.date.substring(0, 4)
    }-${
      rawSong.date.substring(4, 6)
    }-${
      rawSong.date.substring(6, 8)
    }` : null,

    isNew: !!rawSong.new,
    isLocked: null,
  };
}

function extractSheets(rawSong: Record<string, any>) {
  return [
    { type: 'std', difficulty: 'basic', level: rawSong.lev_bas },
    { type: 'std', difficulty: 'advanced', level: rawSong.lev_adv },
    { type: 'std', difficulty: 'expert', level: rawSong.lev_exc },
    { type: 'std', difficulty: 'master', level: rawSong.lev_mas },
    { type: 'lun', difficulty: 'lunatic', level: rawSong.lev_lnt },
  ].filter((e) => !!e.level).map((rawSheet) => ({
    songId: getSongId(rawSong),
    ...rawSheet,
  }));
}

export default async function run() {
  logger.info(`Fetching data from: ${DATA_URL} ...`);
  const response = await axios.get(DATA_URL);

  const rawSongs: Record<string, any>[] = response.data;
  preprocessRawSongs(rawSongs);
  logger.info(`OK, ${rawSongs.length} songs fetched.`);

  logger.info('Ensuring every song has an unique songId ...');
  ensureNoDuplicateEntry(rawSongs.map((rawSong) => getSongId(rawSong)));

  const songs = rawSongs.map((rawSong) => extractSong(rawSong));
  const sheets = rawSongs.flatMap((rawSong) => extractSheets(rawSong));

  logger.info('Preparing Songs table ...');
  await Song.sync();

  logger.info('Preparing Sheets table ...');
  await Sheet.sync();

  logger.info('Updating songs ...');
  await Promise.all(songs.map((song) => Song.upsert(song)));

  logger.info('Updating sheets ...');
  await Promise.all(sheets.map((sheet) => Sheet.upsert(sheet)));

  logger.info('Done!');
}

if (require.main === module) run();

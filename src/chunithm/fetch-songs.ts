import axios from 'axios';
import log4js from 'log4js';
import { hashed, ensureNoDuplicateEntry } from '@/core/utils';
import { Song, Sheet, JpSheet } from './models';

const logger = log4js.getLogger('chunithm/fetch-songs');
logger.level = log4js.levels.INFO;

const DATA_URL = 'https://chunithm.sega.jp/storage/json/music.json';
const IMAGE_BASE_URL = 'https://new.chunithm-net.com/chuni-mobile/html/mobile/img/';

function getSongId(rawSong: Record<string, any>) {
  if (rawSong.catname === 'WORLD\'S END') {
    //! hotfix
    if (rawSong.title === 'G e n g a o z o' && rawSong.id === '8203') {
      return '(WE) G e n g a o z o (2)';
    }
    return `(WE) ${rawSong.title}`;
  }
  return rawSong.title as string;
}

function preprocessRawSongs(rawSongs: Record<string, any>[]) {
  for (const rawSong of rawSongs) {
    if (rawSong.we_kanji) {
      rawSong.catname = 'WORLD\'S END';
    }
  }
}

function extractSong(rawSong: Record<string, any>) {
  const imageUrl = new URL(rawSong.image, IMAGE_BASE_URL).toString();
  const imageName = `${hashed(imageUrl)}.png`;

  return {
    songId: getSongId(rawSong),

    category: rawSong.catname,
    title: rawSong.title,
    artist: rawSong.artist,

    imageName,
    imageUrl,

    version: null,
    releaseDate: null,
    sortOrder: Number(rawSong.id) < 8000 ? Number(rawSong.id) : Number(rawSong.id) - 10000,

    isNew: !!Number(rawSong.newflag),
    isLocked: null,
  };
}

function extractSheets(rawSong: Record<string, any>) {
  return [
    { type: 'std', difficulty: 'basic', level: rawSong.lev_bas },
    { type: 'std', difficulty: 'advanced', level: rawSong.lev_adv },
    { type: 'std', difficulty: 'expert', level: rawSong.lev_exp },
    { type: 'std', difficulty: 'master', level: rawSong.lev_mas },
    { type: 'std', difficulty: 'ultima', level: rawSong.lev_ult },
    {
      type: 'we',
      difficulty: rawSong.we_kanji !== '' ? `【${rawSong.we_kanji}】` : null,
      level: rawSong.we_star !== '' ? '☆'.repeat((Number(rawSong.we_star) + 1) / 2) : null,
    },
  ].filter((e) => !!e.level).map((rawSheet) => ({
    songId: getSongId(rawSong),
    ...rawSheet,
  }));
}

export default async function run() {
  logger.info(`Fetching data from: ${DATA_URL} ...`);
  const response = await axios.get(DATA_URL);

  const rawSongs: Record<string, any>[] = response.data;
  rawSongs.sort((a, b) => Number(a.id) - Number(b.id));
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

  logger.info('Preparing JpSheets table ...');
  await JpSheet.sync();

  logger.info('Updating songs ...');
  await Promise.all(songs.map((song) => Song.upsert(song)));

  logger.info('Updating sheets ...');
  await Promise.all(sheets.map((sheet) => Sheet.upsert(sheet)));

  logger.info('Truncating and Inserting jpSheets ...');
  await JpSheet.truncate();
  await JpSheet.bulkCreate(sheets);

  logger.info('Done!');
}

if (require.main === module) run();

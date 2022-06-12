import axios from 'axios';
import log4js from 'log4js';
import { Song, Sheet, JpSheet } from './models';
import { hashed, ensureNoDuplicateEntry } from '../core/utils';

const logger = log4js.getLogger('maimai/fetch-songs');
logger.level = log4js.levels.INFO;

const DATA_URL = 'https://maimai.sega.jp/data/maimai_songs.json';
const IMAGE_BASE_URL = 'https://maimaidx.jp/maimai-mobile/img/Music/';

const versionMap = new Map([
  [0, null],
  [100, 'maimai'],
  [110, 'maimai PLUS'],
  [120, 'GreeN'],
  [130, 'GreeN PLUS'],
  [140, 'ORANGE'],
  [150, 'ORANGE PLUS'],
  [160, 'PiNK'],
  [170, 'PiNK PLUS'],
  [180, 'MURASAKi'],
  [185, 'MURASAKi PLUS'],
  [190, 'MiLK'],
  [195, 'MiLK PLUS'],
  [199, 'FiNALE'],
  [200, 'maimaiでらっくす'],
  [205, 'maimaiでらっくす PLUS'],
  [210, 'Splash'],
  [215, 'Splash PLUS'],
  [220, 'UNiVERSE'],
  [225, 'UNiVERSE PLUS'],
  //! add further version here !//
]);

function getSongId(rawSong: Record<string, any>) {
  if (rawSong.catcode === '宴会場') {
    return `(宴) ${rawSong.title}`;
  }
  if (rawSong.title === 'Link' && rawSong.catcode === 'niconico＆ボーカロイド') {
    return 'Link (2)';
  }
  return rawSong.title;
}

function extractSong(rawSong: Record<string, any>) {
  const imageUrl = new URL(rawSong.image_url, IMAGE_BASE_URL).toString();
  const imageName = `${hashed(imageUrl)}.png`;

  const releaseNo = Number(rawSong.version);
  const versionId = Number(rawSong.version.substring(0, 3));
  // const releaseBatchNo = Number(rawSong.version.substring(3, 5));
  // const sortOrder = Number(rawSong.sort);
  const version = versionMap.get(versionId);
  const releaseDate = Number(rawSong.release) ? `20${rawSong.release.substring(0, 2)}-${rawSong.release.substring(2, 4)}-${rawSong.release.substring(4, 6)}` : null;

  if (version === undefined) {
    logger.warn(`Unknown version id: ${versionId}, remember to add new version entry.`);
  }

  return {
    songId: getSongId(rawSong),

    category: rawSong.catcode,
    title: rawSong.title,

    // titleKana: rawSong.title_kana,
    artist: rawSong.artist.trim(),

    imageName,
    imageUrl,

    // versionId,
    // releaseBatchNo,
    // sortOrder,
    releaseNo,
    version,
    releaseDate,

    isNew: !!rawSong.date,
    isLocked: !!rawSong.key,
  };
}

function extractSheets(rawSong: Record<string, any>) {
  return [
    { type: 'dx', difficulty: 'basic', level: rawSong.dx_lev_bas },
    { type: 'dx', difficulty: 'advanced', level: rawSong.dx_lev_adv },
    { type: 'dx', difficulty: 'expert', level: rawSong.dx_lev_exp },
    { type: 'dx', difficulty: 'master', level: rawSong.dx_lev_mas },
    { type: 'dx', difficulty: 'remaster', level: rawSong.dx_lev_remas },
    { type: 'std', difficulty: 'basic', level: rawSong.lev_bas },
    { type: 'std', difficulty: 'advanced', level: rawSong.lev_adv },
    { type: 'std', difficulty: 'expert', level: rawSong.lev_exp },
    { type: 'std', difficulty: 'master', level: rawSong.lev_mas },
    { type: 'std', difficulty: 'remaster', level: rawSong.lev_remas },
    { type: 'utage', difficulty: rawSong.utage_type, level: rawSong.lev_utage },
  ].filter((e) => !!e.level).map((rawSheet) => ({
    songId: getSongId(rawSong),
    ...rawSheet,
  }));
}

export default async function run() {
  logger.info(`Fetching data from: ${DATA_URL} ...`);
  const response = await axios.get(DATA_URL);

  const rawSongs: Record<string, any>[] = response.data;
  logger.info(`OK, ${rawSongs.length} songs fetched.`);

  logger.info('Ensuring every song has an unique songId ...');
  ensureNoDuplicateEntry(rawSongs.map((rawSong) => getSongId(rawSong)));

  const songs = rawSongs.map((rawSong) => extractSong(rawSong));
  const sheets = rawSongs.flatMap((rawSong) => extractSheets(rawSong));

  logger.info('Preparing Songs table ...');
  await Song.sync();

  logger.info('Preparing Sheets table ...');
  await Sheet.sync();

  logger.info('Recreating JpSheets table ...');
  await JpSheet.sync({ force: true });

  logger.info('Updating songs ...');
  await Promise.all(songs.map((song) => Song.upsert(song)));

  logger.info('Updating sheets ...');
  await Promise.all(sheets.map((sheet) => Sheet.upsert(sheet)));

  logger.info('Inserting jpSheets ...');
  await JpSheet.bulkCreate(sheets);

  logger.info('Done!');
}

if (require.main === module) run();

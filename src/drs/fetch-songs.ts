import { URLSearchParams } from 'node:url';
import axios from 'axios';
import log4js from 'log4js';
import { hashed, ensureNoDuplicateEntry } from '@/_core/utils';
import { Song, Sheet, SongBpm } from '@@/db/drs/models';

const logger = log4js.getLogger('drs/fetch-songs');
logger.level = log4js.levels.INFO;

const DATA_URL = 'https://p.eagate.573.jp/game/dan/1st/json/musiclist_getdata.html';
const IMAGE_BASE_URL = 'https://p.eagate.573.jp/game/dan/1st/img/jacket.html';

const categoryMasks = [
  /* eslint-disable no-bitwise */
  { mask: 1 << 0, category: 'LICENSE' },
  { mask: 1 << 1, category: 'レッスン' },
  { mask: 1 << 2, category: 'おすすめ' },
  { mask: 1 << 3, category: 'POPS' },
  { mask: 1 << 4, category: 'EDM' },
  { mask: 1 << 5, category: 'SPINNIN’ RECORDS' },
  { mask: 1 << 6, category: 'BEMANI' },
  /* eslint-enable no-bitwise */
];

function getSongId(rawSong: Record<string, any>) {
  return rawSong.info.title_name;
}

function extractSong(rawSong: Record<string, any>) {
  const id = rawSong.info.music_id;

  const imageUrl = `${IMAGE_BASE_URL}?c=${id}`;
  const imageName = `${hashed(imageUrl)}.png`;

  return {
    songId: getSongId(rawSong),

    category: categoryMasks
      // eslint-disable-next-line no-bitwise
      .filter((e) => (Number(rawSong.info.genre) & e.mask) !== 0)
      .map((e) => e.category).join('|'),
    title: rawSong.info.title_name,
    artist: rawSong.info.artist_name,

    bpm: Number(rawSong.info.bpm_max ?? rawSong.info.bpm_min) / 100,

    imageName,
    imageUrl,

    version: null,
    releaseDate: null,

    isNew: null,
    isLocked: Number(rawSong.info.limitation_type) < 3,

    comment: null,
  };
}

function extractSheets(rawSong: Record<string, any>) {
  return [
    { type: 'std', difficulty: 'easy', level: rawSong.difficulty.fumen_1b?.difnum },
    { type: 'std', difficulty: 'normal', level: rawSong.difficulty.fumen_1a?.difnum },
    { type: 'dual', difficulty: 'easy', level: rawSong.difficulty.fumen_2b?.difnum },
    { type: 'dual', difficulty: 'normal', level: rawSong.difficulty.fumen_2a?.difnum },
  ].filter((e) => !!e.level).map((rawSheet) => ({
    songId: getSongId(rawSong),
    ...rawSheet,
  }));
}

export default async function run() {
  logger.info(`Fetching data from: ${DATA_URL} ...`);
  const response = await axios.post(DATA_URL, new URLSearchParams({
    service_kind: 'music_list',
  }));

  const rawSongs: Record<string, any>[] = response.data.musiclist;
  logger.info(`OK, ${rawSongs.length} songs fetched.`);

  logger.info('Ensuring every song has an unique songId ...');
  ensureNoDuplicateEntry(rawSongs.map((rawSong) => getSongId(rawSong)));

  const songs = rawSongs.map((rawSong) => extractSong(rawSong));
  const sheets = rawSongs.flatMap((rawSong) => extractSheets(rawSong));

  logger.info('Updating songs ...');
  await Promise.all(songs.map((song) => Song.upsert(song)));
  await Promise.all(songs.map((song) => SongBpm.upsert(song)));

  logger.info('Updating sheets ...');
  await Promise.all(sheets.map((sheet) => Sheet.upsert(sheet)));

  logger.info('Done!');
}

if (require.main === module) run();

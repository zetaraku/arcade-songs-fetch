import axios from 'axios';
import log4js from 'log4js';
import { hashed, ensureNoDuplicateEntry } from '@/_core/utils';
import { Song, Sheet } from '@@/db/polarischord/models';

const logger = log4js.getLogger('polarischord/fetch-songs');
logger.level = log4js.levels.INFO;

const DATA_URL = 'https://p.eagate.573.jp/game/polarischord/pc/json/common_getdata.html';
const IMAGE_BASE_URL = 'https://p.eagate.573.jp/game/polarischord/pc/img/music/jacket.html';

const categoryMasks = [
  /* eslint-disable no-bitwise */
  { mask: 1 << 0, category: 'Virtual' },
  { mask: 1 << 1, category: 'ソーシャルミュージック' },
  { mask: 1 << 2, category: 'POPS&アニメ' },
  { mask: 1 << 3, category: '東方' },
  { mask: 1 << 4, category: 'バラエティ' },
  { mask: 1 << 5, category: 'オリジナル' },
  /* eslint-enable no-bitwise */
];

function getSongId(rawSong: Record<string, any>) {
  const { name: title } = rawSong;
  return title;
}

function extractSong(rawSong: Record<string, any>) {
  const id = rawSong.music_id;

  const imageUrl = `${IMAGE_BASE_URL}?c=${id}`;
  const imageName = `${hashed(imageUrl)}.png`;

  return {
    songId: getSongId(rawSong),

    category: categoryMasks
      // eslint-disable-next-line no-bitwise
      .filter((e) => (Number(rawSong.genre) & e.mask) !== 0)
      .map((e) => e.category).join('|'),
    title: rawSong.name,
    artist: rawSong.composer || null,

    imageName,
    imageUrl,

    version: null,
    releaseDate: null,

    isNew: null,
    isLocked: null,

    comment: null,
  };
}

function extractSheets(rawSong: Record<string, any>) {
  return [
    { type: 'std', difficulty: 'easy', level: rawSong.easy },
    { type: 'std', difficulty: 'normal', level: rawSong.normal },
    { type: 'std', difficulty: 'hard', level: rawSong.hard },
    { type: 'std', difficulty: 'influence', level: rawSong.influence },
    // { type: 'std', difficulty: 'polar', level: rawSong.polar },
  ].filter((e) => e.level !== 0).map((rawSheet) => ({
    songId: getSongId(rawSong),
    ...rawSheet,
    level: String(rawSheet.level),
  }));
}

export default async function run() {
  logger.info(`Fetching data from: ${DATA_URL} ...`);
  const response = await axios.post(DATA_URL, new URLSearchParams({
    service_kind: 'music_list',
  }));

  const rawSongs: Record<string, any>[] = response.data.data.musiclist.music;
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

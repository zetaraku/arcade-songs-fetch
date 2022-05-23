import axios from 'axios';
import log4js from 'log4js';
import { Song, Sheet, JpSheet } from './models';
import { hashed } from '../core/utils';

const logger = log4js.getLogger('chunithm/fetch-songs');
logger.level = log4js.levels.INFO;

const DATA_URL = 'https://chunithm.sega.jp/storage/json/music.json';
const IMAGE_BASE_URL = 'https://new.chunithm-net.com/chuni-mobile/html/mobile/img/';

function extractSong(rawSong: Record<string, any>) {
  const imageUrl = new URL(rawSong.image, IMAGE_BASE_URL).toString();
  const imageName = `${hashed(imageUrl)}.png`;

  return {
    songId: Number(rawSong.id),

    category: rawSong.we_kanji !== '' ? 'WORLD\'S END' : rawSong.catname,
    title: rawSong.title,

    // titleKana: rawSong.reading,
    artist: rawSong.artist,

    imageName,
    imageUrl,

    version: null,
    releaseDate: null,

    isNew: !!Number(rawSong.newflag),
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
      difficulty: rawSong.we_kanji !== '' ? rawSong.we_kanji : null,
      level: rawSong.we_star !== '' ? '☆'.repeat((Number(rawSong.we_star) + 1) / 2) : null,
    },
  ].filter((e) => !!e.level).map((rawSheet) => ({
    songId: Number(rawSong.id),
    category: rawSong.we_kanji !== '' ? 'WORLD\'S END' : rawSong.catname,
    title: rawSong.title,
    ...rawSheet,
  }));
}

export default async function run() {
  logger.info(`Fetching data from: ${DATA_URL} ...`);
  const response = await axios.get(DATA_URL);

  const rawSongs: Record<string, any>[] = response.data;
  logger.info(`OK, ${rawSongs.length} songs fetched.`);

  rawSongs.sort((a, b) => Number(a.id) - Number(b.id));

  logger.info('Preparing Songs table ...');
  await Song.sync();

  logger.info('Preparing Sheets table ...');
  await Sheet.sync();

  logger.info('Updating songs ...');
  const songs = rawSongs.map((rawSong) => extractSong(rawSong));
  await Promise.all(songs.map((song) => Song.upsert(song)));

  logger.info('Updating sheets ...');
  const sheets = rawSongs.flatMap((rawSong) => extractSheets(rawSong));
  await Promise.all(sheets.map((sheet) => Sheet.upsert(sheet)));

  logger.info('Recreating JpSheets table ...');
  await JpSheet.sync({ force: true });

  logger.info('Inserting sheets ...');
  await JpSheet.bulkCreate(sheets);

  logger.info('Done!');
}

if (require.main === module) run();

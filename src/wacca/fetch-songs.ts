import axios from 'axios';
import log4js from 'log4js';
import { decodeHTML } from 'entities';
import { Song, Sheet } from './models';
import { hashed } from '../core/utils';

const logger = log4js.getLogger('wacca/fetch-songs');
logger.level = log4js.levels.INFO;

const DATA_URL = 'https://wacca.marv.jp/music/search.php';

function extractSong(rawSong: Record<string, any>) {
  const imageUrl = rawSong.jacket ? rawSong.jacket : null;
  const imageName = imageUrl ? `${hashed(imageUrl)}.png` : null;

  // const versionId = rawSong.id.split(/[-_]/)[0].trim();
  // const releaseBatchNo = Number(rawSong.id.split(/[-_]/)[1].trim());
  const releaseDate = new Date(rawSong.release_date).toISOString().slice(0, 10);

  return {
    category: rawSong.category,
    title: decodeHTML(rawSong.title.display.trim()),

    // titleKana: decodeHTML(rawSong.title.ruby.trim()),
    artist: decodeHTML(rawSong.artist.display.trim()),

    imageName,
    imageUrl,

    // versionId,
    // releaseBatchNo,
    version: null,
    releaseDate,

    isNew: rawSong.new === 'true',
  };
}

function extractSheets(rawSong: Record<string, any>) {
  const levels = rawSong.level.reduce(
    (acc: Record<string, any>, e: any) => ({ ...acc, ...e }),
    {},
  );

  return [
    { type: 'std', difficulty: 'normal', level: levels.normal },
    { type: 'std', difficulty: 'hard', level: levels.hard },
    { type: 'std', difficulty: 'expert', level: levels.expert },
    { type: 'std', difficulty: 'inferno', level: levels.inferno },
  ].filter((e) => !!e.level).map((rawSheet) => ({
    category: rawSong.category,
    title: decodeHTML(rawSong.title.display.trim()),
    ...rawSheet,
  }));
}

export default async function run() {
  logger.info(`Fetching data from: ${DATA_URL} ...`);
  const response = await axios.post(DATA_URL, 'cat=all');

  const rawSongs: Record<string, any>[] = response.data;
  logger.info(`OK, ${rawSongs.length} songs fetched.`);

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

  logger.info('Done!');
}

if (require.main === module) run();

import axios from 'axios';
import log4js from 'log4js';
import { decodeHTML } from 'entities';
import { hashed, ensureNoDuplicateEntry } from '@/_core/utils';
import { Song, Sheet } from '@@/db/wacca/models';

const logger = log4js.getLogger('wacca/fetch-songs');
logger.level = log4js.levels.INFO;

const DATA_URL = 'https://wacca.marv.jp/music/search.php';

function getSongId(rawSong: Record<string, any>) {
  const title = decodeHTML(rawSong.title.display.trim());
  return title;
}

function extractSong(rawSong: Record<string, any>) {
  const imageUrl = rawSong.jacket;
  const imageName = `${hashed(imageUrl)}.png`;

  // const versionId = rawSong.id.split(/[-_]/)[0].trim();
  // const releaseBatchNo = Number(rawSong.id.split(/[-_]/)[1].trim());
  const releaseDate = new Date(rawSong.release_date).toISOString().slice(0, 10);

  return {
    songId: getSongId(rawSong),

    category: rawSong.category,
    title: decodeHTML(rawSong.title.display.trim()),
    artist: decodeHTML(rawSong.artist.display.trim()),

    imageName,
    imageUrl,

    version: null,
    releaseDate,

    isNew: rawSong.new === 'true',
    isLocked: null,
  };
}

function extractSheets(rawSong: Record<string, any>) {
  const levels = rawSong.level.reduce(
    (acc: Record<string, any>, e: Record<string, any>) => ({ ...acc, ...e }),
    {},
  );

  return [
    { type: 'std', difficulty: 'normal', level: levels.normal },
    { type: 'std', difficulty: 'hard', level: levels.hard },
    { type: 'std', difficulty: 'expert', level: levels.expert },
    { type: 'std', difficulty: 'inferno', level: levels.inferno },
  ].filter((e) => !!e.level).map((rawSheet) => ({
    songId: getSongId(rawSong),
    ...rawSheet,
  }));
}

export default async function run() {
  logger.info(`Fetching data from: ${DATA_URL} ...`);
  const response = await axios.post(DATA_URL, 'cat=all');

  const rawSongs: Record<string, any>[] = response.data;
  logger.info(`OK, ${rawSongs.length} songs fetched.`);

  rawSongs.reverse();

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

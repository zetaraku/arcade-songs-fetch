import axios from 'axios';
import log4js from 'log4js';
import { SongExtra } from '@@/db/chunithm/models';
import 'dotenv/config';

const logger = log4js.getLogger('chunithm/fetch-extras');
logger.level = log4js.levels.INFO;

function getSongId(rawSong: Record<string, any>) {
  if (rawSong.meta.genre === 'WORLD\'S END') {
    //! hotfix
    if (rawSong.meta.title === 'G e n g a o z o【覚】') {
      return '(WE) G e n g a o z o (2)';
    }
    if (rawSong.meta.title === 'Aragami【光】') {
      return '(WE) Aragami (2)';
    }
    return `(WE) ${(rawSong.meta.title as string).replace(/【.】$/, '')}`;
  }
  return rawSong.meta.title as string;
}

function extractSongExtra(rawSong: Record<string, any>) {
  return {
    songId: getSongId(rawSong),
    releaseDate: rawSong.meta.release,
    bpm: rawSong.meta.bpm || null,
  };
}

async function fetchSongs() {
  if (!process.env.CHUNITHM_CHUNIREC_ACCESS_TOKEN) {
    throw new Error('Please set your CHUNITHM_CHUNIREC_ACCESS_TOKEN in the .env file');
  }

  const response = await axios.get('https://api.chunirec.net/2.0/music/showall.json', {
    params: {
      region: 'jp2',
      token: process.env.CHUNITHM_CHUNIREC_ACCESS_TOKEN,
    },
  });

  const rawSongs: Record<string, any>[] = response.data;

  return rawSongs;
}

export default async function run() {
  logger.info('Fetching data from chunirec API v2.0 ...');
  const rawSongs = await fetchSongs();
  logger.info(`OK, ${rawSongs.length} songs fetched.`);

  logger.info('Truncating and Inserting songExtras ...');
  const songExtras = rawSongs.map((rawSong) => extractSongExtra(rawSong));
  await SongExtra.truncate();
  await SongExtra.bulkCreate(songExtras, { ignoreDuplicates: true });

  logger.info('Done!');
}

if (require.main === module) run();

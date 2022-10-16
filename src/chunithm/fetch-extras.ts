import axios from 'axios';
import log4js from 'log4js';
import { SongExtra } from '@@/db/chunithm/models';
import 'dotenv/config';

const logger = log4js.getLogger('chunithm/fetch-extras');
logger.level = log4js.levels.INFO;

function getSongId(rawSong: Record<string, any>): string {
  const genre = rawSong.meta.genre as string;
  const title = rawSong.meta.title as string;
  if (genre === 'WORLD\'S END') {
    //! hotfix
    if (title === 'G e n g a o z o【狂】') return '(WE) G e n g a o z o';
    if (title === 'G e n g a o z o【覚】') return '(WE) G e n g a o z o (2)';
    if (title === 'Aragami【蔵】') return '(WE) Aragami';
    if (title === 'Aragami【光】') return '(WE) Aragami (2)';
    if (title === 'Random【分A】') return '(WE) Random';
    if (title === 'Random【分B】') return '(WE) Random (2)';
    if (title === 'Random【分C】') return '(WE) Random (3)';
    if (title === 'Random【分D】') return '(WE) Random (4)';
    if (title === 'Random【分E】') return '(WE) Random (5)';
    if (title === 'Random【分F】') return '(WE) Random (6)';
    return `(WE) ${title.replace(/【.】$/, '')}`;
  }
  return title;
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

  logger.info('Updating songExtras ...');
  const songExtras = rawSongs.map((rawSong) => extractSongExtra(rawSong));
  await Promise.all(songExtras.map((songExtra) => SongExtra.upsert(songExtra)));

  logger.info('Done!');
}

if (require.main === module) run();

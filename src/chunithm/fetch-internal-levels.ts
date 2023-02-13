import axios from 'axios';
import log4js from 'log4js';
import { Song, SheetInternalLevel } from '@@/db/chunithm/models';
import { checkUnmatchedEntries } from '@/_core/utils';
import 'dotenv/config';

const logger = log4js.getLogger('chunithm/fetch-internal-levels');
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

function getWeType(rawSong: Record<string, any>) {
  if (rawSong.data.WE === undefined) return undefined;
  const match = (rawSong.meta.title as string).match(/【(?<weType>[^【】]+)】$/);
  if (match === null) return undefined;
  return `【${match.groups!.weType[0]}】`;
}

function extractSheets(rawSong: Record<string, any>) {
  return [
    { type: 'std', difficulty: 'basic', data: rawSong.data.BAS },
    { type: 'std', difficulty: 'advanced', data: rawSong.data.ADV },
    { type: 'std', difficulty: 'expert', data: rawSong.data.EXP },
    { type: 'std', difficulty: 'master', data: rawSong.data.MAS },
    { type: 'std', difficulty: 'ultima', data: rawSong.data.ULT },
    { type: 'we', difficulty: getWeType(rawSong), data: rawSong.data.WE },
  ].filter((e) => !!e.data && !e.data.is_const_unknown && e.data.const !== 0).map((rawSheet) => ({
    songId: getSongId(rawSong),
    type: rawSheet.type,
    difficulty: rawSheet.difficulty,
    internalLevel: rawSheet.data.const.toFixed(1),
  }));
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

  logger.info('Updating sheetInternalLevels ...');
  const sheets = rawSongs.flatMap((rawSong) => extractSheets(rawSong));
  await Promise.all(sheets.map((sheet) => SheetInternalLevel.upsert(sheet)));

  logger.info('Checking unmatched songIds ...');
  checkUnmatchedEntries(
    (await SheetInternalLevel.findAll<any>()).map((sheet) => sheet.songId),
    (await Song.findAll<any>()).map((song) => song.songId),
  );

  logger.info('Done!');
}

if (require.main === module) run();

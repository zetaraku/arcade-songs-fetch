import axios from 'axios';
import log4js from 'log4js';
import { Song, SheetInternalLevel } from '@@/db/chunithm/models';
import { checkUnmatchedEntries, ensureNoDuplicateEntry } from '@/_core/utils';
import { getSongId } from './fetch-extras';
import 'dotenv/config';

const logger = log4js.getLogger('chunithm/fetch-internal-levels');
logger.level = log4js.levels.INFO;

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

  logger.info('Ensuring every song has an unique songId ...');
  ensureNoDuplicateEntry(rawSongs.map((rawSong) => getSongId(rawSong)));

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

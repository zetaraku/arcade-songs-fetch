import axios from 'axios';
import log4js from 'log4js';
import * as cheerio from 'cheerio';
import { Song, SheetInternalLevel } from '@@/db/nostalgia/models';
import { checkUnmatchedEntries, ensureNoDuplicateEntry } from '@/_core/utils';
import 'dotenv/config';

const logger = log4js.getLogger('nostalgia/fetch-internal-levels');
logger.level = log4js.levels.INFO;

function getSongId(rawSheet: Record<string, any>) {
  const { title, level } = rawSheet;
  if (title === 'トルコ行進曲') {
    if (level === '◆2') return 'トルコ行進曲';
    if (level === '◆1') return 'トルコ行進曲 (2)';
  }
  return title;
}

async function fetchSheets() {
  const response = await axios.get('https://nosdata.info/zeta/real.php');

  const $ = cheerio.load(response.data);
  const sheetRows = $('#usertable > tbody > tr').toArray();

  return sheetRows.map((e) => {
    const [, realLevelText, internalLevelText] = $(e).find('td:nth-of-type(1)').text().match(/^◇(\d+)\((.+)\)$/)!;
    const title = $(e).find('td:nth-of-type(2)').text().trim();

    const level = `◆${realLevelText}`;
    const internalLevel = Number(internalLevelText).toFixed(1);

    return {
      songId: getSongId({ title, level }),
      type: 'std',
      difficulty: 'real',
      internalLevel,
    };
  });
}

export default async function run() {
  logger.info('Fetching data from Nosdata ...');
  const sheets = await fetchSheets();
  logger.info(`OK, ${sheets.length} sheets fetched.`);

  logger.info('Ensuring every sheet has an unique sheetExpr ...');
  ensureNoDuplicateEntry(sheets.map((sheet) => [sheet.songId, sheet.type, sheet.difficulty].join('|')));

  logger.info('Updating sheetInternalLevels ...');
  await Promise.all(sheets.map((sheet) => SheetInternalLevel.upsert(sheet)));

  logger.info('Checking unmatched songIds ...');
  checkUnmatchedEntries(
    (await SheetInternalLevel.findAll<any>()).map((sheet) => sheet.songId),
    (await Song.findAll<any>()).map((song) => song.songId),
  );

  logger.info('Done!');
}

if (require.main === module) run();

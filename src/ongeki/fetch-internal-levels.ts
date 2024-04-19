import axios from 'axios';
import log4js from 'log4js';
import * as cheerio from 'cheerio';
import { Song, SheetInternalLevel } from '@@/db/ongeki/models';
import { checkUnmatchedEntries } from '@/_core/utils';
import 'dotenv/config';

const logger = log4js.getLogger('ongeki/fetch-internal-levels');
logger.level = log4js.levels.INFO;

function getSongId(rawSheet: Record<string, any>) {
  const { type, title, id } = rawSheet;
  if (type === 'lun') {
    if (title === 'Perfect Shining!!') return '(LUN) Perfect Shining!!';
    if (title === 'Perfect Shining!!(ロケテスト譜面)') return '(LUN) Perfect Shining!! (2)';
    return `(LUN) ${title}`;
  }
  if (title === 'Singularity') {
    if (id === '362') return 'Singularity';
    if (id === '425') return 'Singularity (2)';
    if (id === '487') return 'Singularity (3)';
  }
  if (title === 'Hand in Hand') {
    if (id === '185') return 'Hand in Hand';
    if (id === '337') return 'Hand in Hand (2)';
  }
  return title;
}

async function fetchSheets() {
  const response = await axios.get('https://ongeki-score.net/music');

  const $ = cheerio.load(response.data);
  const sheetRows = $('#sort_table > table > tbody > tr').toArray();

  return sheetRows.map((e) => {
    const id = $(e).find('td:nth-of-type(1) > a').attr('href')?.match(/^\/music\/(\d+)\/\w+$/)![1];
    const title = $(e).find('td:nth-of-type(1) > a').text()/* .trim() */;

    const { type, difficulty } = {
      Basic: { type: 'std', difficulty: 'basic' },
      Advanced: { type: 'std', difficulty: 'advanced' },
      Expert: { type: 'std', difficulty: 'expert' },
      Master: { type: 'std', difficulty: 'master' },
      Lunatic: { type: 'lun', difficulty: 'lunatic' },
    }[$(e).find('td:nth-of-type(2)').text()]!;

    const internalLevel = Number($(e).find('td:nth-of-type(4)').text()).toFixed(1);
    const isEstimated = $(e).find('td:nth-of-type(4) .estimated-rating').length !== 0;

    return {
      songId: getSongId({ id, title, type }),
      type,
      difficulty,
      internalLevel: !isEstimated ? internalLevel : null,
    };
  });
}

export default async function run() {
  logger.info('Fetching data from OngekiScoreLog ...');
  const sheets = await fetchSheets();
  logger.info(`OK, ${sheets.length} sheets fetched.`);

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

import fs from 'node:fs';
import Sequelize from 'sequelize';
import log4js from 'log4js';
import genJson from '@/_core/gen-json';
import { sequelize } from '@@/db/ddr/models';

const logger = log4js.getLogger('ddr/gen-json');
logger.level = log4js.levels.INFO;

const DIST_PATH = 'dist/ddr';

const categories = [
  { category: null },
  { category: 'FIRST STEP' },
  { category: 'POP MUSIC' },
  { category: 'VIRTUAL POP' },
  { category: 'ANIME & GAME' },
  { category: 'TOUHOU' },
  { category: 'FOR MUSIC GAMERS' },
  //! add further category here !//
];
const versions = [
  { releaseDate: '1998-09-26', version: 'DDR 1st', abbr: '1st' },
  { releaseDate: '1999-01-29', version: 'DDR 2ndMIX', abbr: '2ndMIX' },
  { releaseDate: '1999-10-30', version: 'DDR 3rdMIX', abbr: '3rdMIX' },
  { releaseDate: '2000-08-24', version: 'DDR 4thMIX', abbr: '4thMIX' },
  { releaseDate: '2001-05-02', version: 'DDR 5thMIX', abbr: '5thMIX' },
  { releaseDate: '2001-11-24', version: 'DDRMAX', abbr: 'MAX' },
  { releaseDate: '2002-05-01', version: 'DDRMAX2', abbr: 'MAX2' },
  { releaseDate: '2002-12-25', version: 'DDR EXTREME', abbr: 'EXTREME' },
  { releaseDate: '2006-07-12', version: 'DDR SuperNOVA', abbr: 'SuperNOVA' },
  { releaseDate: '2007-08-22', version: 'DDR SuperNOVA 2', abbr: 'SuperNOVA 2' },
  { releaseDate: '2008-12-24', version: 'DDR X', abbr: 'X' },
  { releaseDate: '2010-07-07', version: 'DDR X2', abbr: 'X2' },
  { releaseDate: '2011-11-16', version: 'DDR X3 VS 2ndMIX', abbr: 'X3 VS 2ndMIX' },
  { releaseDate: '2013-03-14', version: 'DDR (2013)', abbr: '2013' },
  { releaseDate: '2014-05-12', version: 'DDR (2014)', abbr: '2014' },
  { releaseDate: '2016-03-30', version: 'DDR A', abbr: 'A' },
  { releaseDate: '2019-03-20', version: 'DDR A20', abbr: 'A20' },
  { releaseDate: '2020-07-01', version: 'DDR A20 PLUS', abbr: 'A20 PLUS' },
  { releaseDate: '2022-03-17', version: 'DDR A3', abbr: 'A3' },
  { releaseDate: '2024-06-12', version: 'DDR WORLD', abbr: 'WORLD' },
  //! add further version here !//
];
const types = [
  { type: 'std', name: 'SINGLE 譜面', abbr: 'STD', iconUrl: 'type-std.png', iconHeight: 24 },
  { type: 'dbl', name: 'DOUBLE 譜面', abbr: 'DBL', iconUrl: 'type-dbl.png', iconHeight: 24 },
];
const difficulties = [
  { difficulty: 'beginner', name: 'BEGINNER', abbr: '習', color: '#00ffff' },
  { difficulty: 'basic', name: 'BASIC', abbr: '楽', color: '#ffa500' },
  { difficulty: 'difficult', name: 'DIFFICULT', abbr: '踊', color: '#ff0000' },
  { difficulty: 'expert', name: 'EXPERT', abbr: '激', color: '#00ff00' },
  { difficulty: 'challenge', name: 'CHALLENGE', abbr: '鬼', color: '#ff00ff' },
];
const regions = [
  { region: 'jp', name: '日本版' },
];

function getLevelValueOf(sheet: Record<string, any>) {
  if (sheet.level === null) return null;
  return Number(sheet.level);
}
function getIsSpecialOf(_sheet: Record<string, any>) {
  return false;
}

export default async function run() {
  logger.info('Loading songs and sheets from database ...');

  const songRecords = await sequelize.query(/* sql */ `
    SELECT
      *
    FROM "Songs"
  `, {
    type: Sequelize.QueryTypes.SELECT,
    nest: true,
  });

  const sheetRecords = await sequelize.query(/* sql */ `
    SELECT
      *,
      "JpSheets"."songId" IS NOT NULL AS "regions.jp"
    FROM "Sheets"
      NATURAL LEFT JOIN "JpSheets"
  `, {
    type: Sequelize.QueryTypes.SELECT,
    nest: true,
  });

  const jsonText = await genJson({
    songRecords,
    sheetRecords,
    categories,
    versions,
    types,
    difficulties,
    regions,
    getLevelValueOf,
    getIsSpecialOf,
  });

  logger.info(`Writing output into ${DIST_PATH}/data.json ...`);
  fs.mkdirSync(DIST_PATH, { recursive: true });
  fs.writeFileSync(`${DIST_PATH}/data.json`, jsonText);

  logger.info('Done!');
}

if (require.main === module) run();

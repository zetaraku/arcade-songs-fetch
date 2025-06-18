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
  { version: 'DDR 1st', abbr: '1st' },
  { version: 'DDR 2ndMIX', abbr: '2ndMIX' },
  { version: 'DDR 3rdMIX', abbr: '3rdMIX' },
  { version: 'DDR 4thMIX', abbr: '4thMIX' },
  { version: 'DDR 5thMIX', abbr: '5thMIX' },
  { version: 'DDRMAX', abbr: 'MAX' },
  { version: 'DDRMAX2', abbr: 'MAX2' },
  { version: 'DDR EXTREME', abbr: 'EXTREME' },
  { version: 'DDR SuperNOVA', abbr: 'SuperNOVA' },
  { version: 'DDR SuperNOVA 2', abbr: 'SuperNOVA 2' },
  { version: 'DDR X', abbr: 'X' },
  { version: 'DDR X2', abbr: 'X2' },
  { version: 'DDR X3 VS 2ndMIX', abbr: 'X3 VS 2ndMIX' },
  { version: 'DDR (2013)', abbr: '2013' },
  { version: 'DDR (2014)', abbr: '2014' },
  { version: 'DDR A', abbr: 'A' },
  { version: 'DDR A20', abbr: 'A20' },
  { version: 'DDR A20 PLUS', abbr: 'A20 PLUS' },
  { version: 'DDR A3', abbr: 'A3' },
  { version: 'DDR WORLD', abbr: 'WORLD' },
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

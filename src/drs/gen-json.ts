import fs from 'node:fs';
import Sequelize from 'sequelize';
import log4js from 'log4js';
import genJson from '@/_core/gen-json';
import { sequelize } from '@@/db/drs/models';

const logger = log4js.getLogger('drs/gen-json');
logger.level = log4js.levels.INFO;

const DIST_PATH = 'dist/drs';

const categories = [
  { category: 'LICENSE' },
  { category: 'レッスン' },
  { category: 'おすすめ' },
  { category: 'POPS' },
  { category: 'EDM' },
  { category: 'SPINNIN’ RECORDS' },
  { category: 'BEMANI' },
];
const versions = [
  // empty
] as any[];
const types = [
  { type: 'std', name: '1人用', abbr: '1P', iconUrl: 'type-std.png', iconHeight: 22 },
  { type: 'dual', name: '2人用', abbr: '2P', iconUrl: 'type-dual.png', iconHeight: 22 },
];
const difficulties = [
  { difficulty: 'easy', name: 'かんたん', color: '#1dad16', iconUrl: 'difficulty-easy.png', iconHeight: 25 },
  { difficulty: 'normal', name: 'ふつう', color: '#ffa200', iconUrl: 'difficulty-normal.png', iconHeight: 25 },
];
const regions = [
  // empty
] as any[];

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
      LEFT JOIN "SongBpms" USING ("songId")
  `, {
    type: Sequelize.QueryTypes.SELECT,
    nest: true,
  });

  const sheetRecords = await sequelize.query(/* sql */ `
    SELECT
      *
    FROM "Sheets"
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

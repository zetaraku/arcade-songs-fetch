import fs from 'node:fs';
import log4js from 'log4js';
import { QueryTypes } from 'sequelize';
import genJson from '@/_core/gen-json';
import { sequelize } from '@@/db/diva/models';

const logger = log4js.getLogger('diva/gen-json');
logger.level = log4js.levels.INFO;

const DIST_PATH = 'dist/diva';

const categories = [
  // empty
] as any[];
const versions = [
  // empty
] as any[];
const types = [
  // empty
] as any[];
const difficulties = [
  { difficulty: 'easy', name: 'EASY', color: '#2795ff' },
  { difficulty: 'normal', name: 'NORMAL', color: '#3ec053' },
  { difficulty: 'hard', name: 'HARD', color: '#e2e511' },
  { difficulty: 'extreme', name: 'EXTREME', color: '#d42d1d' },
  { difficulty: 'ex_extreme', name: 'EX EXTREME', color: '#7d45fe' },
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
  `, {
    type: QueryTypes.SELECT,
    nest: true,
  });

  const sheetRecords = await sequelize.query(/* sql */ `
    SELECT
      *
    FROM "Sheets"
  `, {
    type: QueryTypes.SELECT,
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

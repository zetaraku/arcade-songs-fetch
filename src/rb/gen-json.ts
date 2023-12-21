import fs from 'node:fs';
import Sequelize from 'sequelize';
import log4js from 'log4js';
import genJson from '@/_core/gen-json';
import { sequelize } from '@@/db/rb/models';

const logger = log4js.getLogger('rb/gen-json');
logger.level = log4js.levels.INFO;

const DIST_PATH = 'dist/rb';

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
  { difficulty: 'basic', name: 'BASIC', color: '#007000' },
  { difficulty: 'medium', name: 'MEDIUM', color: '#f67200' },
  { difficulty: 'hard', name: 'HARD', color: '#c00000' },
  { difficulty: 'special', name: 'WHITE HARD', color: '#ab047f' },
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

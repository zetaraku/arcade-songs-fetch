import fs from 'fs';
import log4js from 'log4js';
import { QueryTypes } from 'sequelize';
import { sequelize } from './models';
import genJson from '../core/gen-json';

const logger = log4js.getLogger('jubeat/gen-json');
logger.level = log4js.levels.INFO;

const DIST_PATH = 'dist/jubeat';

const categories = [
  { category: null },
];
const versions = [
  // empty
] as any[];
const types = [
  { type: 'std', name: '通常譜面', abbr: 'STD' },
  { type: 'v2', name: 'ホールド譜面', abbr: 'V2' },
];
const difficulties = [
  { difficulty: 'basic', name: 'Basic', color: '#77c136' },
  { difficulty: 'advanced', name: 'Advanced', color: '#e4862b' },
  { difficulty: 'extreme', name: 'Extreme', color: '#e42b5b' },
];
const regions = [
  // empty
] as any[];

function getLevelValueOf(sheet: Record<string, any>) {
  if (sheet.level === null) return null;
  return Number(sheet.level);
}
function getIsSpecialOf(sheet: Record<string, any>) {
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

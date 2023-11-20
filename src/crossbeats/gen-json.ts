import fs from 'node:fs';
import Sequelize from 'sequelize';
import log4js from 'log4js';
import genJson from '@/_core/gen-json';
import { sequelize } from '@@/db/crossbeats/models';

const logger = log4js.getLogger('crossbeats/gen-json');
logger.level = log4js.levels.INFO;

const DIST_PATH = 'dist/crossbeats';

const categories = [
  { category: 'J-POP' },
  { category: 'VOCALOID™' },
  { category: '東方Project' },
  { category: 'ORIGINAL' },
  { category: 'VARIETY' },
];
const versions = [
  // empty
] as any[];
const types = [
  // empty
] as any[];
const difficulties = [
  { difficulty: 'easy', name: 'EASY', color: '#438eff' },
  { difficulty: 'standard', name: 'STANDARD', color: '#39ea11' },
  { difficulty: 'hard', name: 'HARD', color: '#fff664' },
  { difficulty: 'master', name: 'MASTER', color: '#d11832' },
  { difficulty: 'unlimited', name: 'UNLIMITED', color: '#c119d0' },
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

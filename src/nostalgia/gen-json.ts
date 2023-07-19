import fs from 'node:fs';
import Sequelize from 'sequelize';
import log4js from 'log4js';
import genJson from '@/_core/gen-json';
import { sequelize } from '@@/db/nostalgia/models';

const logger = log4js.getLogger('nostalgia/gen-json');
logger.level = log4js.levels.INFO;

const DIST_PATH = 'dist/nostalgia';

const categories = [
  { category: 'クラシック/ジャズ' },
  { category: 'ポップス' },
  { category: 'アニメ' },
  { category: 'バラエティ' },
  { category: 'BEMANI楽曲' },
  { category: 'ノスタルジアオリジナル' },
];
const versions = [
  // empty
] as any[];
const types = [
  // empty
] as any[];
const difficulties = [
  { difficulty: 'normal', name: 'Normal', color: '#0a7758' },
  { difficulty: 'hard', name: 'Hard', color: '#ab7205' },
  { difficulty: 'expert', name: 'Expert', color: '#a81f1f' },
  { difficulty: 'real', name: 'Real', color: '#bb1db9' },
];
const regions = [
  // empty
] as any[];

function getLevelValueOf(sheet: Record<string, any>) {
  if (sheet.level === null) return null;
  if (sheet.level.includes('◆')) return 90 + Number(sheet.level.replace('◆', ''));
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

import fs from 'fs';
import log4js from 'log4js';
import { QueryTypes } from 'sequelize';
import { sequelize } from './models';
import genJson from '../core/gen-json';

const logger = log4js.getLogger('wacca/gen-json');
logger.level = log4js.levels.INFO;

const DIST_PATH = 'dist/wacca';

const categories = [
  { category: 'アニメ／ＰＯＰ' },
  { category: 'ボカロ' },
  { category: '東方アレンジ' },
  { category: '2.5次元' },
  { category: 'バラエティ' },
  { category: 'オリジナル' },
  { category: 'TANO*C' },
  { category: 'TANO*C（オリジナル）' },
  //! add further category here !//
];
const versions = [
  { dateBefore: '2020-01-22', version: 'WACCA', abbr: 'WACCA' },
  { dateBefore: '2020-09-16', version: 'WACCA S', abbr: 'WACCA S' },
  { dateBefore: '2021-03-10', version: 'WACCA Lily', abbr: 'Lily' },
  { dateBefore: '2021-08-09', version: 'WACCA Lily R', abbr: 'Lily R' },
  { dateBefore: null, version: 'WACCA Reverse', abbr: 'Reverse' },
  //! add further version here !//
];
const types = [
  // empty
] as any[];
const difficulties = [
  { difficulty: 'normal', name: 'NORMAL', color: '#009de6' },
  { difficulty: 'hard', name: 'HARD', color: '#fed131' },
  { difficulty: 'expert', name: 'EXPERT', color: '#fc06a3' },
  { difficulty: 'inferno', name: 'INFERNO', color: '#4a004f' },
];
const regions = [
  // empty
] as any[];

function getLevelValueOf(sheet: Record<string, any>) {
  if (sheet.level === null) return null;
  return Number(sheet.level.replace('+', '.5'));
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
    ORDER BY "releaseDate"
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

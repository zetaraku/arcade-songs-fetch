import fs from 'node:fs';
import Sequelize from 'sequelize';
import log4js from 'log4js';
import genJson from '@/_core/gen-json';
import { sequelize } from '@@/db/popn/models';

const logger = log4js.getLogger('popn/gen-json');
logger.level = log4js.levels.INFO;

const DIST_PATH = 'dist/popn';

const categories = [
  { category: 'TV･ｱﾆﾒ' },
  { category: 'BEMANI' },
  { category: null },
  //! add further category here !//
];
const versions = [
  { version: 'pop\'n 1' },
  { version: 'pop\'n 2' },
  { version: 'pop\'n 3' },
  { version: 'pop\'n 4' },
  { version: 'pop\'n 5' },
  { version: 'pop\'n 6' },
  { version: 'pop\'n 7' },
  { version: 'pop\'n 8' },
  { version: 'pop\'n 9' },
  { version: 'pop\'n 10' },
  { version: 'pop\'n 11' },
  { version: 'pop\'n 12 いろは' },
  { version: 'pop\'n 13 カーニバル' },
  { version: 'pop\'n 14 FEVER!' },
  { version: 'pop\'n 15 ADVENTURE' },
  { version: 'pop\'n 16 PARTY♪' },
  { version: 'pop\'n 17 THE MOVIE' },
  { version: 'pop\'n 18 せんごく列伝' },
  { version: 'pop\'n 19 TUNE STREET' },
  { version: 'pop\'n 20 fantasia' },
  { version: 'pop\'n Sunny Park' },
  { version: 'CS' },
  { version: 'pop\'n ラピストリア' },
  { version: 'pop\'n éclale' },
  { version: 'pop\'n うさぎと猫と少年の夢' },
  { version: 'pop\'n peace' },
  { version: 'pop\'n 解明リドルズ', abbr: 'pop\'n 解明リドルズ (Not updating)' },
  { version: 'pop\'n UniLab', abbr: 'pop\'n UniLab (Not updating)' },
  //! add further version here !//
];
const types = [
  // empty
] as any[];
const difficulties = [
  { difficulty: 'easy', name: 'EASY', color: '#0077ff' },
  { difficulty: 'normal', name: 'NORMAL', color: '#77ff00' },
  { difficulty: 'hyper', name: 'HYPER', color: '#ff7700' },
  { difficulty: 'ex', name: 'EX', color: '#ff0077' },
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
      LEFT JOIN "SongArtists" USING ("songId")
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

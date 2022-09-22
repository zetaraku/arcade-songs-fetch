import fs from 'node:fs';
import Sequelize from 'sequelize';
import log4js from 'log4js';
import genJson from '@/_core/gen-json';
import { sequelize } from '@@/db/gc/models';

const logger = log4js.getLogger('gc/gen-json');
logger.level = log4js.levels.INFO;

const DIST_PATH = 'dist/gc';

const categories = [
  { category: 'アニメ・ポップス' },
  { category: 'ボーカロイド' },
  { category: '東方アレンジ' },
  { category: '音楽ゲーム' },
  { category: 'ゲーム' },
  { category: 'バラエティ' },
  { category: 'オリジナル' },
  //! add further category here !//
];
const versions = [
  { dateBefore: '2014-05-26', version: 'GROOVE COASTER', abbr: '[1] GROOVE COASTER' },
  { dateBefore: '2015-01-22', version: 'GROOVE COASTER EX', abbr: '[EX] GROOVE COASTER EX' },
  { dateBefore: '2016-03-10', version: 'HEAVENLY FESTIVAL', abbr: '[2] HEAVENLY FESTIVAL' },
  { dateBefore: '2017-03-16', version: 'LINK FEVER', abbr: '[3] LINK FEVER' },
  { dateBefore: '2018-03-29', version: 'DREAM PARTY', abbr: '[3EX] DREAM PARTY' },
  { dateBefore: '2019-03-28', version: 'STARLIGHT ROAD', abbr: '[4] STARLIGHT ROAD' },
  { dateBefore: '2020-04-09', version: 'INFINITY∞HIGHWAY', abbr: '[4EX] INFINITY∞HIGHWAY' },
  { dateBefore: null, version: 'DIAMOND GALAXY', abbr: '[4MAX] DIAMOND GALAXY' },
  //! add further mapping here !//
];
const types = [
  // empty
] as any[];
const difficulties = [
  { difficulty: 'simple', name: 'SIMPLE', color: '#20dfb6' },
  { difficulty: 'normal', name: 'NORMAL', color: '#f7bb08' },
  { difficulty: 'hard', name: 'HARD', color: '#ff0000' },
  { difficulty: 'extra', name: 'EXTRA', color: '#808080' },
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
      NATURAL LEFT JOIN "SongExtras"
    ORDER BY "releaseDate"
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

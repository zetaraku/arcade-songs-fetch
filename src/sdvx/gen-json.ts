/* eslint-disable object-curly-newline */
import fs from 'node:fs';
import Sequelize from 'sequelize';
import log4js from 'log4js';
import genJson from '@/_core/gen-json';
import { sequelize } from '@@/db/sdvx/models';

const logger = log4js.getLogger('sdvx/gen-json');
logger.level = log4js.levels.INFO;

const DIST_PATH = 'dist/sdvx';

const categories = [
  { category: 'POPS&アニメ' },
  { category: '東方アレンジ' },
  { category: 'ボーカロイド' },
  { category: 'BEMANI' },
  { category: 'ひなビタ♪/バンめし♪' },
  { category: 'FLOOR' },
  { category: 'SDVXオリジナル' },
  { category: 'その他' },
  //! add further category here !//
];
const versions = [
  { releaseDate: '2012-01-18', version: 'BOOTH', abbr: '[I] BOOTH' },
  { releaseDate: '2013-06-05', version: 'INFINITE INFECTION', abbr: '[II] INFINITE INFECTION' },
  { releaseDate: '2014-11-20', version: 'GRAVITY WARS', abbr: '[III] GRAVITY WARS' },
  { releaseDate: '2016-12-21', version: 'HEAVENLY HAVEN', abbr: '[IV] HEAVENLY HAVEN' },
  { releaseDate: '2019-02-28', version: 'VIVID WAVE', abbr: '[V] VIVID WAVE' },
  { releaseDate: '2021-02-17', version: 'EXCEED GEAR', abbr: '[VI] EXCEED GEAR' },
  { releaseDate: '2025-12-24', version: '∇', abbr: '[VII] ∇' },
  //! add further version here !//
];
const types = [
  // empty
] as any[];
const difficulties = [
  { difficulty: 'novice', name: 'NOVICE', abbr: 'NOV', color: '#5a49fb' },
  { difficulty: 'advanced', name: 'ADVANCED', abbr: 'ADV', color: '#fbb649' },
  { difficulty: 'exhaust', name: 'EXHAUST', abbr: 'EXH', color: '#fb494c' },
  { difficulty: 'maximum', name: 'MAXIMUM', abbr: 'MXM', color: '#acacac' },
  { difficulty: 'infinite', name: 'INFINITE', abbr: 'INF', color: '#ee65e5' },
  { difficulty: 'gravity', name: 'GRAVITY', abbr: 'GRV', color: '#fb8f49' },
  { difficulty: 'heavenly', name: 'HEAVENLY', abbr: 'HVN', color: '#49c9fb' },
  { difficulty: 'vivid', name: 'VIVID', abbr: 'VVD', color: '#ff59cd' },
  { difficulty: 'exceed', name: 'EXCEED', abbr: 'XCD', color: '#187fff' },
  { difficulty: 'ultimate', name: 'ULTIMATE', abbr: 'ULT', color: '#ffdd57' },
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

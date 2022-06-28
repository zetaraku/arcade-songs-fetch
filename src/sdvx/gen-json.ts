import fs from 'fs';
import log4js from 'log4js';
import { QueryTypes } from 'sequelize';
import genJson from '@/core/gen-json';
import { sequelize } from './models';

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
  //! the data source no longer contains version information
  // { version: 'BOOTH', abbr: '[I] BOOTH' },
  // { version: 'INFINITE INFECTION', abbr: '[II] INFINITE INFECTION'},
  // { version: 'GRAVITY WARS', abbr: '[III] GRAVITY WARS' },
  // { version: 'HEAVENLY HAVEN', abbr: '[IV] HEAVENLY HAVEN' },
  // { version: 'VIVID WAVE', abbr: '[V] VIVID WAVE' },
  // { version: 'EXCEED GEAR', abbr: '[VI] EXCEED GEAR' },
  { dateBefore: null, version: null, abbr: null },
  //! add further mapping here !//
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

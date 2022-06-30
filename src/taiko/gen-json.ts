/* eslint-disable object-curly-newline */
import fs from 'node:fs';
import log4js from 'log4js';
import { QueryTypes } from 'sequelize';
import genJson from '@/core/gen-json';
import { sequelize } from '@@/db/taiko/models';

const logger = log4js.getLogger('taiko/gen-json');
logger.level = log4js.levels.INFO;

const DIST_PATH = 'dist/taiko';

const categories = [
  { category: 'ポップス' },
  { category: 'キッズ' },
  { category: 'アニメ' },
  { category: 'ボーカロイド™曲' },
  { category: 'ゲームミュージック' },
  { category: 'バラエティ' },
  { category: 'クラシック' },
  { category: 'ナムコオリジナル' },
  //! add further category here !//
];
const versions = [
  // empty
] as any[];
const types = [
  { type: 'std', name: '表譜面', abbr: '表' },
  { type: 'ura', name: '裏譜面', abbr: '裏', iconUrl: 'type-ura.png', iconHeight: 36 },
];
const difficulties = [
  { difficulty: 'easy', name: 'かんたん', color: '#ff2803', iconUrl: 'difficulty-easy.png', iconHeight: 25 },
  { difficulty: 'normal', name: 'ふつう', color: '#8daf51', iconUrl: 'difficulty-normal.png', iconHeight: 25 },
  { difficulty: 'hard', name: 'むずかしい', color: '#404a2b', iconUrl: 'difficulty-hard.png', iconHeight: 25 },
  { difficulty: 'oni', name: 'おに', color: '#dc1886', iconUrl: 'difficulty-oni.png', iconHeight: 25 },
  { difficulty: 'ura_oni', name: '裏おに', color: '#106479', iconUrl: 'difficulty-ura_oni.png', iconHeight: 25 },
];
const regions = [
  // empty
] as any[];

function getLevelValueOf(sheet: Record<string, any>) {
  if (sheet.level === null) return null;
  return Number(sheet.level.replace('★', ''));
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

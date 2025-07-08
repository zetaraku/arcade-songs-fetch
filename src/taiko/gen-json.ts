/* eslint-disable object-curly-newline */
import fs from 'node:fs';
import Sequelize from 'sequelize';
import log4js from 'log4js';
import genJson from '@/_core/gen-json';
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
  // Gen. 1
  { releaseDate: '2001-02-21', version: '太鼓の達人' },
  { releaseDate: '2001-08-06', version: '太鼓の達人2' },
  { releaseDate: '2002-03-15', version: '太鼓の達人3' },
  { releaseDate: '2002-12-12', version: '太鼓の達人4' },
  { releaseDate: '2003-10-06', version: '太鼓の達人5' },
  { releaseDate: '2004-07-15', version: '太鼓の達人6' },
  // Gen. 2
  { releaseDate: '2005-07-15', version: '太鼓の達人7' },
  { releaseDate: '2006-03-23', version: '太鼓の達人8' },
  { releaseDate: '2006-12-20', version: '太鼓の達人9' },
  { releaseDate: '2007-07-26', version: '太鼓の達人10' },
  { releaseDate: '2008-03-18', version: '太鼓の達人11' },
  { releaseDate: '2008-12-11', version: '太鼓の達人12' },
  { releaseDate: '2009-07-14', version: '太鼓の達人12 ド〜ン!と増量版' },
  { releaseDate: '2009-12-17', version: '太鼓の達人13' },
  { releaseDate: '2010-09-08', version: '太鼓の達人14' },
  // Gen. 3
  { releaseDate: '2011-11-16', version: '太鼓の達人 (2011)' },
  { releaseDate: '2012-07-25', version: 'KATSU-DON' },
  { releaseDate: '2013-03-13', version: 'ソライロ' },
  { releaseDate: '2013-12-11', version: 'モモイロ' },
  { releaseDate: '2014-07-16', version: 'キミドリ' },
  { releaseDate: '2015-03-11', version: 'ムラサキ' },
  { releaseDate: '2015-12-10', version: 'ホワイト' },
  { releaseDate: '2016-07-14', version: 'レッド' },
  { releaseDate: '2017-03-15', version: 'イエロー' },
  { releaseDate: '2018-03-15', version: 'ブルー' },
  { releaseDate: '2019-03-14', version: 'グリーン' },
  // Gen. 4
  { releaseDate: '2020-03-24', version: 'ニジイロ (2020)' },
  { releaseDate: '2021-03-25', version: 'ニジイロ (2021)' },
  { releaseDate: '2022-03-16', version: 'ニジイロ (2022)' },
  { releaseDate: '2023-03-22', version: 'ニジイロ (2023)' },
  { releaseDate: '2024-03-13', version: 'ニジイロ (2024)' },
  { releaseDate: '2025-03-26', version: 'ニジイロ (2025)' },
  //! add further version here !//
];
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

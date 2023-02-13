/* eslint-disable object-curly-newline */
import fs from 'node:fs';
import Sequelize from 'sequelize';
import log4js from 'log4js';
import genJson from '@/_core/gen-json';
import { sequelize } from '@@/db/maimai/models';

const logger = log4js.getLogger('maimai/gen-json');
logger.level = log4js.levels.INFO;

const DIST_PATH = 'dist/maimai';

const categories = [
  { category: 'POPS＆アニメ' },
  { category: 'niconico＆ボーカロイド' },
  { category: '東方Project' },
  { category: 'ゲーム＆バラエティ' },
  { category: 'maimai' },
  { category: 'オンゲキ＆CHUNITHM' },
  { category: '宴会場' },
  //! add further category here !//
];
const versions = [
  { dateBefore: '2012-12-13', version: 'maimai', abbr: 'maimai (真)' },
  { dateBefore: '2013-07-11', version: 'maimai PLUS', abbr: 'maimai+ (真)' },
  { dateBefore: '2014-02-26', version: 'GreeN', abbr: 'GreeN (超)' },
  { dateBefore: '2014-09-18', version: 'GreeN PLUS', abbr: 'GreeN+ (檄)' },
  { dateBefore: '2015-03-19', version: 'ORANGE', abbr: 'ORANGE (橙)' },
  { dateBefore: '2015-12-09', version: 'ORANGE PLUS', abbr: 'ORANGE+ (暁)' },
  { dateBefore: '2016-06-30', version: 'PiNK', abbr: 'PiNK (桃)' },
  { dateBefore: '2016-12-15', version: 'PiNK PLUS', abbr: 'PiNK+ (櫻)' },
  { dateBefore: '2017-06-22', version: 'MURASAKi', abbr: 'MURASAKi (紫)' },
  { dateBefore: '2017-12-14', version: 'MURASAKi PLUS', abbr: 'MURASAKi+ (菫)' },
  { dateBefore: '2018-06-21', version: 'MiLK', abbr: 'MiLK (白)' },
  { dateBefore: '2018-12-13', version: 'MiLK PLUS', abbr: 'MiLK+ (雪)' },
  { dateBefore: '2019-07-11', version: 'FiNALE', abbr: 'FiNALE (輝)' },
  { dateBefore: '2020-01-23', version: 'maimaiでらっくす', abbr: 'でらっくす (熊)' },
  { dateBefore: '2020-09-17', version: 'maimaiでらっくす PLUS', abbr: 'でらっくす+ (華)' },
  { dateBefore: '2021-03-18', version: 'Splash', abbr: 'Splash (爽)' },
  { dateBefore: '2021-09-16', version: 'Splash PLUS', abbr: 'Splash+ (煌)' },
  { dateBefore: '2022-03-24', version: 'UNiVERSE', abbr: 'UNiVERSE (宙)' },
  { dateBefore: '2022-09-15', version: 'UNiVERSE PLUS', abbr: 'UNiVERSE+ (星)' },
  { dateBefore: null, version: 'FESTiVAL', abbr: 'FESTiVAL' },
  //! add further version here !//
];
const types = [
  { type: 'dx', name: 'DX（でらっくす）', abbr: 'DX', iconUrl: 'type-dx.png', iconHeight: 22 },
  { type: 'std', name: 'STD（スタンダード）', abbr: 'STD', iconUrl: 'type-std.png', iconHeight: 22 },
  { type: 'utage', name: '宴（宴会場）', abbr: '宴' },
];
const difficulties = [
  { difficulty: 'basic', name: 'BASIC', color: 'lime' },
  { difficulty: 'advanced', name: 'ADVANCED', color: 'orange' },
  { difficulty: 'expert', name: 'EXPERT', color: 'red' },
  { difficulty: 'master', name: 'MASTER', color: 'darkorchid' },
  { difficulty: 'remaster', name: 'Re:MASTER', color: 'cyan' },
];
const regions = [
  { region: 'jp', name: '日本版' },
  { region: 'intl', name: '海外版 (International ver.)' },
  { region: 'cn', name: '中国版 (舞萌DX)' },
];

function getLevelValueOf(sheet: Record<string, any>) {
  if (sheet.level === null) return null;
  if (sheet.level === '*') return -1;
  return Number(sheet.level.replace('+', '.5'));
}
function getInternalLevelValueOf(sheet: Record<string, any>) {
  if (sheet.internalLevel != null) return Number(sheet.internalLevel);
  if (sheet.level === '*') return 0;
  if (sheet.level != null) return Number(sheet.level.replace('+', '.7'));
  return null;
}
function getIsSpecialOf(sheet: Record<string, any>) {
  return sheet.type === 'utage';
}

export default async function run() {
  logger.info('Loading songs and sheets from database ...');

  const songRecords = await sequelize.query(/* sql */ `
    SELECT
      *
    FROM "Songs"
      NATURAL LEFT JOIN "SongOrders"
      LEFT JOIN "SongExtras" USING ("songId")
    ORDER BY "sortOrder"
  `, {
    type: Sequelize.QueryTypes.SELECT,
    nest: true,
  });

  const sheetRecords = await sequelize.query(/* sql */ `
    SELECT
      *,
      "JpSheets"."songId" IS NOT NULL AS "regions.jp",
      "IntlSheets"."songId" IS NOT NULL AS "regions.intl",
      "CnSheets"."songId" IS NOT NULL AS "regions.cn"
    FROM "Sheets"
      NATURAL LEFT JOIN "SheetVersions"
      NATURAL LEFT JOIN "SheetExtras"
      NATURAL LEFT JOIN "SheetInternalLevels"
      NATURAL LEFT JOIN "JpSheets"
      NATURAL LEFT JOIN "IntlSheets"
      NATURAL LEFT JOIN "CnSheets"
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
    getInternalLevelValueOf,
    getIsSpecialOf,
  });

  logger.info(`Writing output into ${DIST_PATH}/data.json ...`);
  fs.mkdirSync(DIST_PATH, { recursive: true });
  fs.writeFileSync(`${DIST_PATH}/data.json`, jsonText);

  logger.info('Done!');
}

if (require.main === module) run();

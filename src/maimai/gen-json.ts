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
  { releaseDate: '2012-07-11', version: 'maimai', abbr: 'maimai (真)' },
  { releaseDate: '2012-12-13', version: 'maimai PLUS', abbr: 'maimai+ (真)' },
  { releaseDate: '2013-07-11', version: 'GreeN', abbr: 'GreeN (超)' },
  { releaseDate: '2014-02-26', version: 'GreeN PLUS', abbr: 'GreeN+ (檄)' },
  { releaseDate: '2014-09-18', version: 'ORANGE', abbr: 'ORANGE (橙)' },
  { releaseDate: '2015-03-19', version: 'ORANGE PLUS', abbr: 'ORANGE+ (暁)' },
  { releaseDate: '2015-12-09', version: 'PiNK', abbr: 'PiNK (桃)' },
  { releaseDate: '2016-06-30', version: 'PiNK PLUS', abbr: 'PiNK+ (櫻)' },
  { releaseDate: '2016-12-15', version: 'MURASAKi', abbr: 'MURASAKi (紫)' },
  { releaseDate: '2017-06-22', version: 'MURASAKi PLUS', abbr: 'MURASAKi+ (菫)' },
  { releaseDate: '2017-12-14', version: 'MiLK', abbr: 'MiLK (白)' },
  { releaseDate: '2018-06-21', version: 'MiLK PLUS', abbr: 'MiLK+ (雪)' },
  { releaseDate: '2018-12-13', version: 'FiNALE', abbr: 'FiNALE (輝)' },
  { releaseDate: '2019-07-11', version: 'maimaiでらっくす', abbr: 'でらっくす (熊)' },
  { releaseDate: '2020-01-23', version: 'maimaiでらっくす PLUS', abbr: 'でらっくす+ (華)' },
  { releaseDate: '2020-09-17', version: 'Splash', abbr: 'Splash (爽)' },
  { releaseDate: '2021-03-18', version: 'Splash PLUS', abbr: 'Splash+ (煌)' },
  { releaseDate: '2021-09-16', version: 'UNiVERSE', abbr: 'UNiVERSE (宙)' },
  { releaseDate: '2022-03-24', version: 'UNiVERSE PLUS', abbr: 'UNiVERSE+ (星)' },
  { releaseDate: '2022-09-15', version: 'FESTiVAL', abbr: 'FESTiVAL (祭)' },
  { releaseDate: '2023-03-23', version: 'FESTiVAL PLUS', abbr: 'FESTiVAL+ (祝)' },
  { releaseDate: '2023-09-14', version: 'BUDDiES', abbr: 'BUDDiES (双)' },
  { releaseDate: '2024-03-21', version: 'BUDDiES PLUS', abbr: 'BUDDiES+ (宴)' },
  { releaseDate: '2024-09-12', version: 'PRiSM', abbr: 'PRiSM (鏡)' },
  { releaseDate: '2025-03-13', version: 'PRiSM PLUS', abbr: 'PRiSM+ (彩)' },
  { releaseDate: '2025-09-18', version: 'CiRCLE', abbr: 'CiRCLE' },
  //! add further version here !//
];
const types = [
  { type: 'dx', name: 'DX（でらっくす）', abbr: 'DX', iconUrl: 'type-dx.png', iconHeight: 22 },
  { type: 'std', name: 'STD（スタンダード）', abbr: 'STD', iconUrl: 'type-std.png', iconHeight: 22 },
  { type: 'utage', name: '宴（宴会場）', abbr: '宴' },
];
const difficulties = [
  { difficulty: 'basic', name: 'BASIC', color: '#22bb5b' },
  { difficulty: 'advanced', name: 'ADVANCED', color: '#fb9c2d' },
  { difficulty: 'expert', name: 'EXPERT', color: '#f64861' },
  { difficulty: 'master', name: 'MASTER', color: '#9e45e2' },
  { difficulty: 'remaster', name: 'Re:MASTER', color: '#ba67f8' },
];
const regions = [
  { region: 'jp', name: '日本版' },
  { region: 'intl', name: '海外版 (International ver.)' },
  { region: 'cn', name: '中国版 (舞萌DX)' },
];

function getLevelValueOf(sheet: Record<string, any>) {
  if (sheet.level === null) return null;
  if (sheet.level === '*') return 0;
  if (sheet.level.endsWith('?')) return Number(sheet.level.replace('?', '').replace('+', '.6'));
  return Number(sheet.level.replace('+', '.6'));
}
function getInternalLevelValueOf(sheet: Record<string, any>) {
  if (sheet.internalLevel != null) return Number(sheet.internalLevel);
  if (sheet.level === '*') return 0;
  if (sheet.level.endsWith('?')) return Number(sheet.level.replace('?', '').replace('+', '.6'));
  return Number(sheet.level.replace('+', '.6'));
}
function getIsSpecialOf(sheet: Record<string, any>) {
  return sheet.type === 'utage';
}

export default async function run() {
  logger.info('Loading songs and sheets from database ...');

  const songRecords = await sequelize.query(/* sql */ `
    SELECT
      *,
      COALESCE("SongExtras"."releaseDate", "Songs"."releaseDate") AS "releaseDate"
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
      "CnSheets"."songId" IS NOT NULL AS "regions.cn",
      "Sheets"."level" AS "level",
      "IntlSheets"."level" AS "regionOverrides.intl.level",
      "SheetVersions"."version" AS "version",
      "IntlSheetVersions"."version" AS "regionOverrides.intl.version"
    FROM "Sheets"
      NATURAL LEFT JOIN "SheetVersions"
      NATURAL LEFT JOIN "SheetExtras"
      NATURAL LEFT JOIN "SheetInternalLevels"
      NATURAL LEFT JOIN "JpSheets"
      LEFT JOIN "IntlSheets" USING ("songId", "type", "difficulty")
      NATURAL LEFT JOIN "CnSheets"
      LEFT JOIN "IntlSheetVersions" USING ("songId", "type")
  `, {
    type: Sequelize.QueryTypes.SELECT,
    nest: true,
  });

  for (const sheetRecord of sheetRecords as any[]) {
    // postprocess region overrides
    for (const region of Object.keys(sheetRecord.regionOverrides)) {
      const regionOverride = sheetRecord.regionOverrides[region];

      // remove empty override properties
      for (const key of Object.keys(regionOverride)) {
        if (regionOverride[key] == null || regionOverride[key] === sheetRecord[key]) {
          delete regionOverride[key];
        }
      }

      // override levelValue manually if level is overridden
      if ('level' in regionOverride) {
        regionOverride.levelValue = getLevelValueOf({ level: regionOverride.level });
      }
    }
  }

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

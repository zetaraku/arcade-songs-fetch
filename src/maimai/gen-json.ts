/* eslint-disable object-curly-newline */
import fs from 'node:fs';
import log4js from 'log4js';
import { QueryTypes } from 'sequelize';
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
  { version: 'maimai', abbr: 'maimai' },
  { version: 'maimai PLUS', abbr: 'maimai+' },
  { version: 'GreeN', abbr: 'GreeN' },
  { version: 'GreeN PLUS', abbr: 'GreeN+' },
  { version: 'ORANGE', abbr: 'ORANGE' },
  { version: 'ORANGE PLUS', abbr: 'ORANGE+' },
  { version: 'PiNK', abbr: 'PiNK' },
  { version: 'PiNK PLUS', abbr: 'PiNK+' },
  { version: 'MURASAKi', abbr: 'MURASAKi' },
  { version: 'MURASAKi PLUS', abbr: 'MURASAKi+' },
  { version: 'MiLK', abbr: 'MiLK' },
  { version: 'MiLK PLUS', abbr: 'MiLK+' },
  { version: 'FiNALE', abbr: 'FiNALE' },
  { version: 'maimaiでらっくす', abbr: 'でらっくす' },
  { version: 'maimaiでらっくす PLUS', abbr: 'でらっくす+' },
  { version: 'Splash', abbr: 'Splash' },
  { version: 'Splash PLUS', abbr: 'Splash+' },
  { version: 'UNiVERSE', abbr: 'UNiVERSE' },
  { version: 'UNiVERSE PLUS', abbr: 'UNiVERSE+' },
  { version: 'FESTiVAL', abbr: 'FESTiVAL' },
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
      NATURAL LEFT JOIN "SongExtras"
    ORDER BY "sortOrder"
  `, {
    type: QueryTypes.SELECT,
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

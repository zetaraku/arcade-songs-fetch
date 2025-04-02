import fs from 'node:fs';
import Sequelize from 'sequelize';
import log4js from 'log4js';
import genJson from '@/_core/gen-json';
import { sequelize } from '@@/db/ongeki/models';

const logger = log4js.getLogger('ongeki/gen-json');
logger.level = log4js.levels.INFO;

const DIST_PATH = 'dist/ongeki';

const categories = [
  { category: 'オンゲキ' },
  { category: 'POPS＆ANIME' },
  { category: 'niconico' },
  { category: '東方Project' },
  { category: 'VARIETY' },
  { category: 'チュウマイ' },
  { category: 'ボーナストラック' },
  { category: 'LUNATIC' },
  //! add further category here !//
];
const versions = [
  { releaseDate: '2018-07-26', version: 'オンゲキ', abbr: 'オンゲキ' },
  { releaseDate: '2019-02-07', version: 'オンゲキ PLUS', abbr: 'オンゲキ+' },
  { releaseDate: '2019-08-22', version: 'SUMMER', abbr: 'SUMMER' },
  { releaseDate: '2020-02-20', version: 'SUMMER PLUS', abbr: 'SUMMER+' },
  { releaseDate: '2020-09-30', version: 'R.E.D.', abbr: 'R.E.D.' },
  { releaseDate: '2021-03-31', version: 'R.E.D. PLUS', abbr: 'R.E.D.+' },
  { releaseDate: '2021-10-21', version: 'bright', abbr: 'bright' },
  { releaseDate: '2022-03-03', version: 'bright MEMORY', abbr: 'bright+' },
  { releaseDate: '2025-03-27', version: 'Re:Fresh', abbr: 'Re:Fresh' },
  //! add further mapping here !//
];
const types = [
  { type: 'std', name: 'STANDARD', abbr: 'STD' },
  { type: 'lun', name: 'LUNATIC', abbr: 'LUN' },
];
const difficulties = [
  { difficulty: 'basic', name: 'BASIC', color: '#16ff47' },
  { difficulty: 'advanced', name: 'ADVANCED', color: '#ffba00' },
  { difficulty: 'expert', name: 'EXPERT', color: '#fa0667' },
  { difficulty: 'master', name: 'MASTER', color: '#a810ff' },
  { difficulty: 'lunatic', name: 'LUNATIC', color: '#dee600' },
];
const regions = [
  { region: 'jp', name: '日本版' },
] as any[];

function getLevelValueOf(sheet: Record<string, any>) {
  if (sheet.level === null) return null;
  return Number(sheet.level.replace('+', '.7'));
}
function getInternalLevelValueOf(sheet: Record<string, any>) {
  if (sheet.internalLevel != null) return Number(sheet.internalLevel);
  if (sheet.level != null) return Number(sheet.level.replace('+', '.7'));
  return null;
}
function getIsSpecialOf(sheet: Record<string, any>) {
  return sheet.type === 'lun';
}

export default async function run() {
  logger.info('Loading songs and sheets from database ...');

  const songRecords = await sequelize.query(/* sql */ `
    SELECT
      *
    FROM "Songs"
    ORDER BY "releaseDate"
  `, {
    type: Sequelize.QueryTypes.SELECT,
    nest: true,
  });

  const sheetRecords = await sequelize.query(/* sql */ `
    SELECT
      *,
      "JpSheets"."songId" IS NOT NULL AS "regions.jp"
    FROM "Sheets"
      NATURAL LEFT JOIN "SheetInternalLevels"
      NATURAL LEFT JOIN "JpSheets"
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

import fs from 'node:fs';
import Sequelize from 'sequelize';
import log4js from 'log4js';
import genJson from '@/_core/gen-json';
import { sequelize } from '@@/db/chunithm/models';

const logger = log4js.getLogger('chunithm/gen-json');
logger.level = log4js.levels.INFO;

const DIST_PATH = 'dist/chunithm';

const categories = [
  { category: 'POPS & ANIME' },
  { category: 'niconico' },
  { category: '東方Project' },
  { category: 'VARIETY' },
  { category: 'イロドリミドリ' },
  { category: 'ゲキマイ' },
  { category: 'ORIGINAL' },
  //! add further category here !//
];
const versions = [
  //! the data source no longer contains version information
  { dateBefore: '2016-02-04', version: 'CHUNITHM', abbr: 'CHUNITHM' },
  { dateBefore: '2016-08-25', version: 'CHUNITHM PLUS', abbr: 'CHUNITHM+' },
  { dateBefore: '2017-02-09', version: 'AIR', abbr: 'AIR' },
  { dateBefore: '2017-08-24', version: 'AIR PLUS', abbr: 'AIR+' },
  { dateBefore: '2018-03-08', version: 'STAR', abbr: 'STAR' },
  { dateBefore: '2018-10-25', version: 'STAR PLUS', abbr: 'STAR+' },
  { dateBefore: '2019-04-11', version: 'AMAZON', abbr: 'AMAZON' },
  { dateBefore: '2019-10-24', version: 'AMAZON PLUS', abbr: 'AMAZON+' },
  { dateBefore: '2020-07-16', version: 'CRYSTAL', abbr: 'CRYSTAL' },
  { dateBefore: '2021-01-21', version: 'CRYSTAL PLUS', abbr: 'CRYSTAL+' },
  { dateBefore: '2021-05-13', version: 'PARADISE', abbr: 'PARADISE' },
  { dateBefore: '2021-11-04', version: 'PARADISE LOST', abbr: 'PARADISE+' },
  { dateBefore: '2022-04-14', version: 'CHUNITHM NEW', abbr: 'NEW' },
  { dateBefore: '2022-10-13', version: 'CHUNITHM NEW PLUS', abbr: 'NEW+' },
  { dateBefore: null, version: 'SUN', abbr: 'SUN' },
  //! add further mapping here !//
];
const types = [
  { type: 'std', name: 'STANDARD', abbr: 'STD' },
  { type: 'we', name: 'WORLD\'S END', abbr: 'WE' },
];
const difficulties = [
  { difficulty: 'basic', name: 'BASIC', color: 'lime' },
  { difficulty: 'advanced', name: 'ADVANCED', color: 'orange' },
  { difficulty: 'expert', name: 'EXPERT', color: 'red' },
  { difficulty: 'master', name: 'MASTER', color: 'darkorchid' },
  { difficulty: 'ultima', name: 'ULTIMA', color: 'black' },
];
const regions = [
  { region: 'jp', name: '日本版' },
  { region: 'intl', name: '海外版 (International ver.)' },
];

function getLevelValueOf(sheet: Record<string, any>) {
  if (sheet.level === null) return null;
  if (sheet.level.includes('☆')) return 100 + [...sheet.level].length;
  return Number(sheet.level.replace('+', '.5'));
}
function getIsSpecialOf(sheet: Record<string, any>) {
  return sheet.type === 'we';
}

export default async function run() {
  logger.info('Loading songs and sheets from database ...');

  const songRecords = await sequelize.query(/* sql */ `
    SELECT
      *
    FROM "Songs"
      NATURAL LEFT JOIN "SongOrders"
      LEFT JOIN "SongExtras" USING ("songId")
      -- must not use NATURAL LEFT JOIN "SongExtras" here because we're overriding the "releaseDate" column
    ORDER BY "isNew", "SongExtras"."releaseDate", "sortOrder"
      -- must specify the "releaseDate" in "SongExtras" otherwise "Songs"."releaseDate" will be used
  `, {
    type: Sequelize.QueryTypes.SELECT,
    nest: true,
  });

  const sheetRecords = await sequelize.query(/* sql */ `
    SELECT
      *,
      "JpSheets"."songId" IS NOT NULL AS "regions.jp",
      "IntlSheets"."songId" IS NOT NULL AS "regions.intl"
    FROM "Sheets"
      NATURAL LEFT JOIN "SheetInternalLevels"
      NATURAL LEFT JOIN "JpSheets"
      NATURAL LEFT JOIN "IntlSheets"
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

import fs from 'node:fs';
import Sequelize from 'sequelize';
import log4js from 'log4js';
import genJson from '@/_core/gen-json';
import { sequelize } from '@@/db/museca/models';

const logger = log4js.getLogger('museca/gen-json');
logger.level = log4js.levels.INFO;

const DIST_PATH = 'dist/museca';

const categories = [
  // empty
] as any[];
const versions = [
  { releaseDate: '2015-12-10', version: 'MÚSECA' },
  { releaseDate: '2016-07-27', version: 'MÚSECA 1+1/2' },
  //! add further version here !//
];
const types = [
  { type: 'std', name: '通常譜面', abbr: 'STD' },
];
const difficulties = [
  { difficulty: 'midori', name: '翠', color: '#6fa200' },
  { difficulty: 'daidai', name: '橙', color: '#e9c15a' },
  { difficulty: 'aka', name: '朱', color: '#a25353' },
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

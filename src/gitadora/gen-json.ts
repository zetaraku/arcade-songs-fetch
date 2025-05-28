import fs from 'node:fs';
import Sequelize from 'sequelize';
import log4js from 'log4js';
import genJson from '@/_core/gen-json';
import { sequelize } from '@@/db/gitadora/models';

const logger = log4js.getLogger('gitadora/gen-json');
logger.level = log4js.levels.INFO;

const DIST_PATH = 'dist/gitadora';

const categories = [
  // empty
] as any[];
const versions = [
  // empty
] as any[];
const types = [
  { type: 'guitar', name: 'GUITAR', abbr: 'GUITAR', iconUrl: 'type-guitar.png', iconHeight: 22 },
  { type: 'bass', name: 'BASS', abbr: 'BASS', iconUrl: 'type-bass.png', iconHeight: 22 },
  { type: 'drum', name: 'DRUM', abbr: 'DRUM', iconUrl: 'type-drum.png', iconHeight: 22 },
];
const difficulties = [
  { difficulty: 'basic', name: 'BASIC', color: '#5297ff' },
  { difficulty: 'advanced', name: 'ADVANCED', color: '#beaf02' },
  { difficulty: 'extreme', name: 'EXTREME', color: '#e10035' },
  { difficulty: 'master', name: 'MASTER', color: '#c800cf' },
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

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
  { releaseDate: '2013-02-14', version: 'GITADORA' },
  { releaseDate: '2014-03-05', version: 'OverDrive' },
  { releaseDate: '2015-04-21', version: 'Tri-Boost' },
  { releaseDate: '2016-12-14', version: 'Tri-Boost Re:EVOLVE' },
  { releaseDate: '2017-09-06', version: 'Matixx' },
  { releaseDate: '2018-09-12', version: 'EXCHAIN' },
  { releaseDate: '2019-10-02', version: 'NEX＋AGE' },
  { releaseDate: '2021-04-21', version: 'HIGH-VOLTAGE' },
  { releaseDate: '2022-12-14', version: 'FUZZ-UP' },
  { releaseDate: '2024-03-13', version: 'GALAXY WAVE' },
  { releaseDate: '2025-03-17', version: 'GALAXY WAVE DELTA' },
  //! add further version here !//
];
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

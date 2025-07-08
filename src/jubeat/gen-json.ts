import fs from 'node:fs';
import Sequelize from 'sequelize';
import log4js from 'log4js';
import genJson from '@/_core/gen-json';
import { sequelize } from '@@/db/jubeat/models';

const logger = log4js.getLogger('jubeat/gen-json');
logger.level = log4js.levels.INFO;

const DIST_PATH = 'dist/jubeat';

const categories = [
  // empty
] as any[];
const versions = [
  { releaseDate: '2008-07-24', version: 'jubeat' },
  { releaseDate: '2009-08-05', version: 'ripples' },
  { releaseDate: '2010-03-18', version: 'ripples APPEND' },
  { releaseDate: '2010-07-29', version: 'knit' },
  { releaseDate: '2011-03-23', version: 'knit APPEND' },
  { releaseDate: '2011-09-15', version: 'copious' },
  { releaseDate: '2012-03-14', version: 'copious APPEND' },
  { releaseDate: '2012-09-25', version: 'saucer' },
  { releaseDate: '2014-03-03', version: 'saucer fulfill' },
  { releaseDate: '2015-02-20', version: 'prop' },
  { releaseDate: '2016-03-30', version: 'Qubell' },
  { releaseDate: '2017-07-26', version: 'clan' },
  { releaseDate: '2018-09-05', version: 'festo' },
  { releaseDate: '2022-08-03', version: 'Ave.' },
  { releaseDate: '2023-09-20', version: 'beyond the Ave.' },
  //! add further version here !//
];
const types = [
  { type: 'std', name: '通常譜面', abbr: 'STD' },
  { type: 'v2', name: '[2] 譜面', abbr: 'V2' },
];
const difficulties = [
  { difficulty: 'basic', name: 'Basic', color: '#77c136' },
  { difficulty: 'advanced', name: 'Advanced', color: '#e4862b' },
  { difficulty: 'extreme', name: 'Extreme', color: '#e42b5b' },
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

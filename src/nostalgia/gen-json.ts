import fs from 'node:fs';
import Sequelize from 'sequelize';
import log4js from 'log4js';
import genJson from '@/_core/gen-json';
import { sequelize } from '@@/db/nostalgia/models';

const logger = log4js.getLogger('nostalgia/gen-json');
logger.level = log4js.levels.INFO;

const DIST_PATH = 'dist/nostalgia';

const categories = [
  { category: 'クラシック/ジャズ' },
  { category: 'ポップス' },
  { category: 'アニメ' },
  { category: 'バラエティ' },
  { category: 'BEMANI楽曲' },
  { category: 'ノスタルジアオリジナル' },
  //! add further category here !//
];
const versions = [
  { releaseDate: '2017-03-01', version: 'ノスタルジア' },
  { releaseDate: '2017-07-19', version: 'FORTE' },
  { releaseDate: '2018-09-26', version: 'Op.2' },
  { releaseDate: '2019-12-02', version: 'Op.3' },
  //! add further version here !//
];
const types = [
  // empty
] as any[];
const difficulties = [
  { difficulty: 'normal', name: 'Normal', color: '#0a7758' },
  { difficulty: 'hard', name: 'Hard', color: '#ab7205' },
  { difficulty: 'expert', name: 'Expert', color: '#a81f1f' },
  { difficulty: 'real', name: 'Real', color: '#bb1db9' },
];
const regions = [
  // empty
] as any[];

function getLevelValueOf(sheet: Record<string, any>) {
  if (sheet.level != null) return sheet.level.includes('◆') ? 90 + Number(sheet.level.replace('◆', '')) : Number(sheet.level);
  return null;
}
function getInternalLevelValueOf(sheet: Record<string, any>) {
  if (sheet.internalLevel != null) return Number(sheet.internalLevel);
  if (sheet.level != null) return sheet.level.includes('◆') ? 10 + Number(sheet.level.replace('◆', '')) : Number(sheet.level);
  return null;
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
      NATURAL LEFT JOIN "SheetInternalLevels"
  `, {
    type: Sequelize.QueryTypes.SELECT,
    nest: true,
  });

  /*
    Levels of non-Real sheets have a known internal level relationship.
  */
  for (const sheetRecord of sheetRecords as Record<string, any>[]) {
    const levelValue = getLevelValueOf(sheetRecord);
    if (sheetRecord.difficulty !== 'real' && levelValue !== null) {
      sheetRecord.internalLevel = levelValue.toFixed(1);
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

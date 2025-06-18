import fs from 'node:fs';
import Sequelize from 'sequelize';
import log4js from 'log4js';
import genJson from '@/_core/gen-json';
import { sequelize } from '@@/db/polarischord/models';

const logger = log4js.getLogger('polarischord/gen-json');
logger.level = log4js.levels.INFO;

const DIST_PATH = 'dist/polarischord';

const categories = [
  { category: 'Virtual' },
  { category: 'ソーシャルミュージック' },
  { category: 'POPS&アニメ' },
  { category: '東方' },
  { category: 'バラエティ' },
  { category: 'オリジナル' },
  //! add further category here !//
];
const versions = [
  // empty
] as any[];
const types = [
  // empty
] as any[];
const difficulties = [
  { difficulty: 'easy', name: 'EASY', color: '#00c6ff' },
  { difficulty: 'normal', name: 'NORMAL', color: '#00bf69' },
  { difficulty: 'hard', name: 'HARD', color: '#ffa800' },
  { difficulty: 'influence', name: 'INFLUENCE', color: '#ff55ac' },
  // { difficulty: 'polar', name: 'POLAR', color: undefined },
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

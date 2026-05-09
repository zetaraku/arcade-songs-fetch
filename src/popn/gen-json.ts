import fs from 'node:fs';
import Sequelize from 'sequelize';
import log4js from 'log4js';
import genJson from '@/_core/gen-json';
import { sequelize } from '@@/db/popn/models';

const logger = log4js.getLogger('popn/gen-json');
logger.level = log4js.levels.INFO;

const DIST_PATH = 'dist/popn';

const categories = [
  { category: 'オススメ' },
  { category: '東方アレンジ' },
  { category: 'ひなビタ♪' },
  { category: 'バンめし♪' },
  { category: 'TV・アニメ' },
  { category: 'J-POP' },
  { category: 'NET MUSIC・VOCALOID' },
  { category: 'クラシック' },
  { category: 'GAME MUSIC' },
  { category: null },
  { category: 'beatmania IIDX' },
  { category: 'DanceDanceRevolution' },
  { category: 'GITADORA' },
  { category: 'jubeat' },
  { category: 'REFLEC BEAT' },
  { category: 'SOUND VOLTEX' },
  { category: 'BeatStream' },
  { category: 'MUSECA' },
  { category: 'ノスタルジア' },
  { category: 'BEMANI' },
  //! add further category here !//
];
const versions = [
  { releaseDate: '0001-01-01', version: 'pop\'n 家庭用' },
  { releaseDate: '1998-09-28', version: 'pop\'n music' },
  { releaseDate: '1999-03-26', version: 'pop\'n music 2' },
  { releaseDate: '1999-09-16', version: 'pop\'n music 3' },
  { releaseDate: '2000-03-16', version: 'pop\'n music 4' },
  { releaseDate: '2000-11-17', version: 'pop\'n music 5' },
  { releaseDate: '2001-05-11', version: 'pop\'n music 6' },
  { releaseDate: '2001-11-22', version: 'pop\'n music 7' },
  { releaseDate: '2002-05-30', version: 'pop\'n music 8' },
  { releaseDate: '2002-12-26', version: 'pop\'n music 9' },
  { releaseDate: '2003-08-06', version: 'pop\'n music 10' },
  { releaseDate: '2004-03-24', version: 'pop\'n music 11' },
  { releaseDate: '2004-12-08', version: 'pop\'n music 12 いろは' },
  { releaseDate: '2005-09-07', version: 'pop\'n music 13 カーニバル' },
  { releaseDate: '2006-05-17', version: 'pop\'n music 14 FEVER！' },
  { releaseDate: '2007-04-25', version: 'pop\'n music 15 ADVENTURE' },
  { releaseDate: '2008-03-24', version: 'pop\'n music 16 PARTY♪' },
  { releaseDate: '2009-03-04', version: 'pop\'n music 17 THE MOVIE' },
  { releaseDate: '2010-01-20', version: 'pop\'n music 18 せんごく列伝' },
  { releaseDate: '2010-12-09', version: 'pop\'n music 19 TUNE STREET' },
  { releaseDate: '2011-12-07', version: 'pop\'n music 20 fantasia' },
  { releaseDate: '2012-12-05', version: 'pop\'n music Sunny Park' },
  { releaseDate: '2014-06-25', version: 'pop\'n music ラピストリア' },
  { releaseDate: '2015-11-26', version: 'pop\'n music éclale' },
  { releaseDate: '2016-12-14', version: 'pop\'n music うさぎと猫と少年の夢' },
  { releaseDate: '2018-10-17', version: 'pop\'n music peace' },
  { releaseDate: '2020-12-09', version: 'pop\'n music 解明リドルズ' },
  { releaseDate: '2022-09-13', version: 'pop\'n music UniLab' },
  { releaseDate: '2024-09-25', version: 'pop\'n music Jam&Fizz', abbr: 'pop\'n Jam&Fizz (Not complete)' },
  { releaseDate: '2025-12-18', version: 'pop\'n music High☆Cheers!!', abbr: 'pop\'n music High☆Cheers!! (Not complete)' },
  //! add further version here !//
];
const types = [
  { type: 'std', name: 'STANDARD', abbr: 'STD' },
  { type: 'upper', name: 'UPPER', abbr: 'UPPER' },
];
const difficulties = [
  { difficulty: 'light', name: 'LIGHT', color: '#0077ff' },
  { difficulty: 'normal', name: 'NORMAL', color: '#77ff00' },
  { difficulty: 'hyper', name: 'HYPER', color: '#ff7700' },
  { difficulty: 'ex', name: 'EX', color: '#ff0077' },
];
const regions = [
  { region: 'jp', name: '日本版' },
];

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
      -- LEFT JOIN "SongArtists" USING ("songId")
  `, {
    type: Sequelize.QueryTypes.SELECT,
    nest: true,
  });

  const sheetRecords = await sequelize.query(/* sql */ `
    SELECT
      *,
      "JpSheets"."songId" IS NOT NULL AS "regions.jp"
    FROM "Sheets"
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
    getIsSpecialOf,
  });

  logger.info(`Writing output into ${DIST_PATH}/data.json ...`);
  fs.mkdirSync(DIST_PATH, { recursive: true });
  fs.writeFileSync(`${DIST_PATH}/data.json`, jsonText);

  logger.info('Done!');
}

if (require.main === module) run();

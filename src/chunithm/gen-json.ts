/* eslint-disable no-await-in-loop */
import fs from 'fs';
import log4js from 'log4js';
import { QueryTypes } from 'sequelize';
import { sequelize } from './models';
import { getSheetSorter } from '../core/utils';

const logger = log4js.getLogger('chunithm/gen-json');
logger.level = log4js.levels.INFO;

const DIST_PATH = 'dist/chunithm';

const categoryMappingList = [
  { category: 'POPS & ANIME' },
  { category: 'niconico' },
  { category: '東方Project' },
  { category: 'VARIETY' },
  { category: 'イロドリミドリ' },
  { category: 'ゲキマイ' },
  { category: 'ORIGINAL' },
  //! add further category here !//
];
const versionMappingList = [
  //! the data source no longer contains version information
  // { dateBefore: '2016-02-04', version: 'CHUNITHM', abbr: 'CHUNITHM' },
  // { dateBefore: '2016-08-25', version: 'CHUNITHM PLUS', abbr: 'CHUNITHM+' },
  // { dateBefore: '2017-02-09', version: 'AIR', abbr: 'AIR' },
  // { dateBefore: '2017-08-24', version: 'AIR PLUS', abbr: 'AIR+' },
  // { dateBefore: '2018-03-08', version: 'STAR', abbr: 'STAR' },
  // { dateBefore: '2018-10-25', version: 'STAR PLUS', abbr: 'STAR+' },
  // { dateBefore: '2019-04-11', version: 'AMAZON', abbr: 'AMAZON' },
  // { dateBefore: '2019-10-24', version: 'AMAZON PLUS', abbr: 'AMAZON+' },
  // { dateBefore: '2020-07-16', version: 'CRYSTAL', abbr: 'CRYSTAL' },
  // { dateBefore: '2021-01-21', version: 'CRYSTAL PLUS', abbr: 'CRYSTAL+' },
  // { dateBefore: '2021-05-13', version: 'PARADISE', abbr: 'PARADISE' },
  // { dateBefore: '2021-11-04', version: 'PARADISE LOST', abbr: 'PARADISE+' },
  // { dateBefore: '2022-04-14', version: 'CHUNITHM NEW', abbr: 'NEW' },
  // { dateBefore: null, version: 'CHUNITHM NEW PLUS', abbr: 'NEW+' },
  { dateBefore: null, version: null, abbr: null },
  //! add further mapping here !//
] as any[];
const typeMappingList = [
  { type: 'std', name: 'STANDARD', abbr: 'STD' },
  { type: 'we', name: 'WORLD\'S END', abbr: 'WE' },
];
const difficultyMappingList = [
  { difficulty: 'basic', name: 'BASIC', color: 'lime' },
  { difficulty: 'advanced', name: 'ADVANCED', color: 'orange' },
  { difficulty: 'expert', name: 'EXPERT', color: 'red' },
  { difficulty: 'master', name: 'MASTER', color: 'darkorchid' },
  { difficulty: 'ultima', name: 'ULTIMA', color: 'black' },
];
const regionMappingList = [
  { region: 'jp', name: '日本版' },
  { region: 'intl', name: '海外版 (International ver.)' },
];

const sheetSorter = getSheetSorter({ typeMappingList, difficultyMappingList });

function levelValueOf(level: string | null) {
  if (level === null) return null;
  if (level.includes('☆')) return 100 + [...level].length;
  return Number(level.replace('+', '.5'));
}

export default async function run() {
  logger.info('Loading songs from database ...');
  const songs: Record<string, any>[] = await sequelize.query(/* sql */ `
    SELECT * FROM "Songs"
    ORDER BY "sortOrder"
  `, {
    type: QueryTypes.SELECT,
  });

  logger.info('Loading sheets from database ...');
  for (const song of songs) {
    const sheetsOfSong = sheetSorter.sorted(
      await sequelize.query(/* sql */ `
        SELECT
          *,
          "JpSheets"."songId" IS NOT NULL AS "regions.jp",
          "IntlSheets"."songId" IS NOT NULL AS "regions.intl"
        FROM "Sheets"
          NATURAL LEFT JOIN "JpSheets"
          NATURAL LEFT JOIN "IntlSheets"
        WHERE "songId" = :songId
      `, {
        type: QueryTypes.SELECT,
        replacements: {
          songId: song.songId,
        },
        nest: true,
      }),
    );

    for (const sheet of sheetsOfSong) {
      delete sheet.songId;

      if (sheet.type === 'we') {
        sheet.difficulty = `【${sheet.difficulty}】`;
        sheet.isSpecial = true;
      }

      sheet.levelValue = levelValueOf(sheet.level);

      for (const region of Object.keys(sheet.regions)) {
        sheet.regions[region] = Boolean(sheet.regions[region]);
      }
    }

    song.version = versionMappingList.find(
      ({ dateBefore }) => !dateBefore || song.releaseDate < dateBefore,
    )?.version;

    delete song.imageUrl;
    delete song.sortOrder;
    song.sheets = sheetsOfSong;
    song.isNew = Boolean(song.isNew);
  }

  const output = {
    songs,
    categories: categoryMappingList,
    versions: versionMappingList,
    types: typeMappingList,
    difficulties: difficultyMappingList,
    regions: regionMappingList,
    updateTime: new Date().toISOString(),
  };

  logger.info(`Writing output into ${DIST_PATH}/data.json ...`);
  fs.mkdirSync(DIST_PATH, { recursive: true });
  fs.writeFileSync(`${DIST_PATH}/data.json`, JSON.stringify(output, null, '\t'));

  logger.info('Done!');
}

if (require.main === module) run();

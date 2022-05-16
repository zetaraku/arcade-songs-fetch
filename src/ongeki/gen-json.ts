/* eslint-disable no-await-in-loop */
import fs from 'fs';
import log4js from 'log4js';
import { QueryTypes } from 'sequelize';
import { sequelize } from './models';
import { getSheetSorter } from '../core/utils';

const logger = log4js.getLogger('ongeki/gen-json');
logger.level = log4js.levels.INFO;

const DIST_PATH = 'dist/ongeki';

const categoryMappingList = [
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
const versionMappingList = [
  { dateBefore: '2019-02-07', version: 'オンゲキ', abbr: 'オンゲキ' },
  { dateBefore: '2019-08-22', version: 'オンゲキ PLUS', abbr: 'オンゲキ+' },
  { dateBefore: '2020-02-20', version: 'SUMMER', abbr: 'SUMMER' },
  { dateBefore: '2020-09-30', version: 'SUMMER PLUS', abbr: 'SUMMER+' },
  { dateBefore: '2021-03-31', version: 'R.E.D.', abbr: 'R.E.D.' },
  { dateBefore: '2021-10-21', version: 'R.E.D. PLUS', abbr: 'R.E.D.+' },
  { dateBefore: '2022-03-03', version: 'bright', abbr: 'bright' },
  { dateBefore: null, version: 'bright MEMORY', abbr: 'bright+' },
  //! add further mapping here !//
];
const typeMappingList = [
  { type: 'std', name: 'STANDARD', abbr: 'STD', icon_url: null },
  { type: 'lun', name: 'LUNATIC', abbr: 'LUN', icon_url: null },
];
const difficultyMappingList = [
  { difficulty: 'basic', name: 'BASIC', color: '#16ff47' },
  { difficulty: 'advanced', name: 'ADVANCED', color: '#ffba00' },
  { difficulty: 'expert', name: 'EXPERT', color: '#fa0667' },
  { difficulty: 'master', name: 'MASTER', color: '#a810ff' },
  { difficulty: 'lunatic', name: 'LUNATIC', color: '#dee600' },
];
const regionMappingList = [
  // empty
] as any[];

const sheetSorter = getSheetSorter({ typeMappingList, difficultyMappingList });

function levelValueOf(level: string | null) {
  if (level === null) return null;
  return Number(level.replace('+', '.5'));
}

export default async function run() {
  logger.info('Loading songs from database ...');
  const songs: Record<string, any>[] = await sequelize.query(/* sql */ `
    SELECT * FROM "Songs"
    ORDER BY "releaseDate"
  `, {
    type: QueryTypes.SELECT,
  });

  logger.info('Loading sheets from database ...');
  for (const song of songs) {
    const sheetsOfSong = sheetSorter.sorted(
      await sequelize.query(/* sql */ `
        SELECT * FROM "Sheets"
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
      delete sheet.category;
      delete sheet.title;

      if (sheet.type === 'lun') {
        sheet.isSpecial = true;
      }

      sheet.levelValue = levelValueOf(sheet.level);
    }

    song.version = versionMappingList.find(
      ({ dateBefore }) => !dateBefore || song.releaseDate < dateBefore,
    )?.version;

    delete song.songId;
    delete song.imageUrl;
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

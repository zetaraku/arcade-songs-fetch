/* eslint-disable no-await-in-loop */
import fs from 'fs';
import log4js from 'log4js';
import { QueryTypes } from 'sequelize';
import { sequelize } from './models';
import { getSheetSorter } from '../core/utils';

const logger = log4js.getLogger('diva/gen-json');
logger.level = log4js.levels.INFO;

const DIST_PATH = 'dist/diva';

const categoryMappingList = [
  // empty
] as any[];
const versionMappingList = [
  // empty
] as any[];
const typeMappingList = [
  // empty
] as any[];
const difficultyMappingList = [
  { difficulty: 'easy', name: 'EASY', color: '#2795ff' },
  { difficulty: 'normal', name: 'NORMAL', color: '#3ec053' },
  { difficulty: 'hard', name: 'HARD', color: '#e2e511' },
  { difficulty: 'extreme', name: 'EXTREME', color: '#d42d1d' },
  { difficulty: 'ex_extreme', name: 'EX EXTREME', color: '#7d45fe' },
];
const regionMappingList = [
  // empty
] as any[];

const sheetSorter = getSheetSorter({ typeMappingList, difficultyMappingList });

function levelValueOf(level: string | null) {
  if (level === null) return null;
  return Number(level.replace('★', ''));
}

export default async function run() {
  logger.info('Loading songs from database ...');
  const songs: Record<string, any>[] = await sequelize.query(/* sql */ `
    SELECT * FROM "Songs"
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

      sheet.levelValue = levelValueOf(sheet.level);
      sheet.level = sheet.level.replace('★', '');
    }

    delete song.imageUrl;
    song.sheets = sheetsOfSong;
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

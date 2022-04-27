/* eslint-disable no-await-in-loop */
import fs from 'fs';
import log4js from 'log4js';
import { QueryTypes } from 'sequelize';
import { sequelize } from './models';
import { getSheetSorter, extractLevelMappingList } from '../core/utils';

const logger = log4js.getLogger('jubeat/gen-json');
logger.level = log4js.levels.INFO;

const DIST_PATH = 'dist/jubeat';

const categoryMappingList = [
  // empty
] as any[];
const versionMappingList = [
  // empty
] as any[];
const typeMappingList = [
  { type: 'std', name: '通常譜面', abbr: 'STD', iconUrl: null },
  { type: 'v2', name: 'ホールド譜面', abbr: 'V2', iconUrl: null },
];
const difficultyMappingList = [
  { difficulty: 'basic', name: 'Basic', color: '#77c136' },
  { difficulty: 'advanced', name: 'Advanced', color: '#e4862b' },
  { difficulty: 'extreme', name: 'Extreme', color: '#e42b5b' },
];
const regionMappingList = [
  // empty
] as any[];

const sheetSorter = getSheetSorter({ typeMappingList, difficultyMappingList });

function levelValueOf(level: string | null) {
  if (level === null) return null;
  return Number(level);
}

export default async function run() {
  logger.info('Loading songs from database ...');
  const songs: any[] = await sequelize.query(/* sql */ `
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
      delete sheet.category;
      delete sheet.title;

      sheet.levelValue = levelValueOf(sheet.level);
    }

    delete song.songId;
    delete song.imageUrl;
    song.sheets = sheetsOfSong;
  }

  songs.reverse();

  const output = {
    songs,
    levels: extractLevelMappingList(songs),
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

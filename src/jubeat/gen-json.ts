/* eslint-disable no-await-in-loop */
import fs from 'fs';
import log4js from 'log4js';
import { QueryTypes } from 'sequelize';
import { sequelize } from './models';

const logger = log4js.getLogger('jubeat/gen-json');
logger.level = log4js.levels.INFO;

const DIST_PATH = 'dist/jubeat';

const typeMappingList = [
  { type: 'std', name: '通常譜面', abbr: 'STD', iconUrl: null },
  { type: 'v2', name: 'ホールド譜面', abbr: 'V2', iconUrl: null },
];
const difficultyMappingList = [
  { difficulty: 'basic', name: 'Basic', color: '#77c136' },
  { difficulty: 'advanced', name: 'Advanced', color: '#e4862b' },
  { difficulty: 'extreme', name: 'Extreme', color: '#e42b5b' },
];

const typeOrder = {
  std: 1,
  v2: 2,
} as Record<string, number>;
const difficultyOrder = {
  basic: 1,
  advanced: 2,
  extreme: 3,
} as Record<string, number>;

function levelValueOf(level: string | null) {
  if (level === null) return null;
  return Number(level);
}

export default async function run() {
  const levelMappings = new Map();

  logger.info('Loading songs from database ...');
  const songs: any[] = await sequelize.query(/* sql */ `
    SELECT * FROM "Songs"
  `, {
    type: QueryTypes.SELECT,
  });

  logger.info('Loading sheets from database ...');
  for (const song of songs) {
    const sheetsOfSong: any[] = await sequelize.query(/* sql */ `
      SELECT * FROM "Sheets"
      WHERE "songId" = :songId
    `, {
      type: QueryTypes.SELECT,
      replacements: {
        songId: song.songId,
      },
      nest: true,
    });

    sheetsOfSong.sort((a, b) => (
      typeOrder[a.type] - typeOrder[b.type]
      || difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]
    ));

    for (const sheet of sheetsOfSong) {
      delete sheet.songId;
      delete sheet.category;
      delete sheet.title;

      sheet.levelValue = levelValueOf(sheet.level);
      levelMappings.set(sheet.levelValue, sheet.level);
    }

    delete song.songId;
    delete song.imageUrl;
    song.sheets = sheetsOfSong;
  }

  songs.reverse();

  const levels = (
    [...levelMappings.entries()]
      .sort(([aLevelValue], [bLevelValue]) => aLevelValue - bLevelValue)
      .map(([levelValue, level]) => ({ levelValue, level }))
  );

  const output = {
    songs,
    levels,
    categories: [],
    versions: [],
    types: typeMappingList,
    difficulties: difficultyMappingList,
    regions: [],
    updateTime: new Date().toISOString(),
  };

  logger.info(`Writing output into ${DIST_PATH}/data.json ...`);
  fs.mkdirSync(DIST_PATH, { recursive: true });
  fs.writeFileSync(`${DIST_PATH}/data.json`, JSON.stringify(output, null, '\t'));

  logger.info('Done!');
}

if (require.main === module) run();

/* eslint-disable no-await-in-loop */
import fs from 'fs';
import log4js from 'log4js';
import { QueryTypes } from 'sequelize';
import { sequelize } from './models';
import { getSheetSorter } from '../core/utils';

const logger = log4js.getLogger('sdvx/gen-json');
logger.level = log4js.levels.INFO;

const DIST_PATH = 'dist/sdvx';

const categoryMappingList = [
  { category: 'POPS&アニメ' },
  { category: '東方アレンジ' },
  { category: 'ボーカロイド' },
  { category: 'BEMANI' },
  { category: 'ひなビタ♪/バンめし♪' },
  { category: 'FLOOR' },
  { category: 'SDVXオリジナル' },
  { category: 'その他' },
  //! add further category here !//
];
const versionMappingList = [
  //! the data source no longer contains version information
  // { version: 'BOOTH', abbr: '[I] BOOTH' },
  // { version: 'INFINITE INFECTION', abbr: '[II] INFINITE INFECTION'},
  // { version: 'GRAVITY WARS', abbr: '[III] GRAVITY WARS' },
  // { version: 'HEAVENLY HAVEN', abbr: '[IV] HEAVENLY HAVEN' },
  // { version: 'VIVID WAVE', abbr: '[V] VIVID WAVE' },
  // { version: 'EXCEED GEAR', abbr: '[VI] EXCEED GEAR' },
  { dateBefore: null, version: null, abbr: null },
  //! add further mapping here !//
] as any[];
const typeMappingList = [
  // empty
] as any[];
const difficultyMappingList = [
  { difficulty: 'novice', name: 'NOVICE', abbr: 'NOV', color: '#5a49fb' },
  { difficulty: 'advanced', name: 'ADVANCED', abbr: 'ADV', color: '#fbb649' },
  { difficulty: 'exhaust', name: 'EXHAUST', abbr: 'EXH', color: '#fb494c' },
  { difficulty: 'maximum', name: 'MAXIMUM', abbr: 'MXM', color: '#acacac' },
  { difficulty: 'infinite', name: 'INFINITE', abbr: 'INF', color: '#ee65e5' },
  { difficulty: 'gravity', name: 'GRAVITY', abbr: 'GRV', color: '#fb8f49' },
  { difficulty: 'heavenly', name: 'HEAVENLY', abbr: 'HVN', color: '#49c9fb' },
  { difficulty: 'vivid', name: 'VIVID', abbr: 'VVD', color: '#ff59cd' },
  { difficulty: 'exceed', name: 'EXCEED', abbr: 'XCD', color: '#187fff' },
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
    }

    song.version = versionMappingList.find(
      ({ dateBefore }) => !dateBefore || song.releaseDate < dateBefore,
    )?.version;

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

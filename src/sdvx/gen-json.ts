/* eslint-disable no-await-in-loop */
import fs from 'fs';
import log4js from 'log4js';
import { QueryTypes } from 'sequelize';
import { sequelize } from './models';
import { extractLevelMappingList } from '../core/utils';

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
// const versionMappingList = [
//   { version_id: 'sv', version: 'BOOTH', abbr: '[I] BOOTH' },
//   { version_id: 'ii', version: 'INFINITE INFECTION', abbr: '[II] INFINITE INFECTION'},
//   { version_id: 'iii', version: 'GRAVITY WARS', abbr: '[III] GRAVITY WARS' },
//   { version_id: 'iv', version: 'HEAVENLY HAVEN', abbr: '[IV] HEAVENLY HAVEN' },
//   { version_id: 'v', version: 'VIVID WAVE', abbr: '[V] VIVID WAVE' },
//   { version_id: 'vi', version: 'EXCEED GEAR', abbr: '[VI] EXCEED GEAR' },
//   //! add further mapping here !//
// ];
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

const typeOrder = {
  std: 1,
} as Record<string, number>;
const difficultyOrder = {
  novice: 1,
  advanced: 2,
  exhaust: 3,
  maximum: 4,
  infinite: 5,
  gravity: 6,
  heavenly: 7,
  vivid: 8,
  exceed: 9,
} as Record<string, number>;

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
    versions: [],
    types: [],
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

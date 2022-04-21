/* eslint-disable no-await-in-loop */
import fs from 'fs';
import log4js from 'log4js';
import { QueryTypes } from 'sequelize';
import { sequelize } from './models';

const logger = log4js.getLogger('wacca/gen-json');
logger.level = log4js.levels.INFO;

const DIST_PATH = 'dist/wacca';

const categoryMappingList = [
  { category: 'アニメ／ＰＯＰ' },
  { category: 'ボカロ' },
  { category: '東方アレンジ' },
  { category: '2.5次元' },
  { category: 'バラエティ' },
  { category: 'オリジナル' },
  { category: 'TANO*C' },
  { category: 'TANO*C（オリジナル）' },
  //! add further category here !//
];
const versionMappingList = [
  { dateBefore: '2020-01-22', version: 'WACCA', abbr: 'WACCA' },
  { dateBefore: '2020-09-16', version: 'WACCA S', abbr: 'WACCA S' },
  { dateBefore: '2021-03-10', version: 'WACCA Lily', abbr: 'Lily' },
  { dateBefore: '2021-08-09', version: 'WACCA Lily R', abbr: 'Lily R' },
  { dateBefore: null, version: 'WACCA Reverse', abbr: 'Reverse' },
  //! add further version here !//
];
// const typeMappingList = [
//   { type: 'std', name: 'STANDARD', abbr: 'STD', iconUrl: null },
// ];
const difficultyMappingList = [
  { difficulty: 'normal', name: 'NORMAL', color: '#009de6' },
  { difficulty: 'hard', name: 'HARD', color: '#fed131' },
  { difficulty: 'expert', name: 'EXPERT', color: '#fc06a3' },
  { difficulty: 'inferno', name: 'INFERNO', color: '#4a004f' },
];

const typeOrder = {
  std: 1,
} as Record<string, number>;
const difficultyOrder = {
  normal: 1,
  hard: 2,
  expert: 3,
  inferno: 4,
} as Record<string, number>;

function levelValueOf(level: string | null) {
  if (level === null) return null;
  return Number(level.replace('+', '.5'));
}

export default async function run() {
  const levelMappings = new Map();

  logger.info('Loading songs from database ...');
  const songs: any[] = await sequelize.query(/* sql */ `
    SELECT * FROM "Songs"
    ORDER BY releaseDate
  `, {
    type: QueryTypes.SELECT,
  });

  logger.info('Loading sheets from database ...');
  for (const song of songs) {
    const sheetsOfSong: any[] = await sequelize.query(/* sql */ `
      SELECT * FROM "Sheets"
      WHERE "category" = :category AND "title" = :title
    `, {
      type: QueryTypes.SELECT,
      replacements: {
        category: song.category,
        title: song.title,
      },
      nest: true,
    });

    sheetsOfSong.sort((a, b) => (
      typeOrder[a.type] - typeOrder[b.type]
      || difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]
    ));

    for (const sheet of sheetsOfSong) {
      delete sheet.category;
      delete sheet.title;

      sheet.levelValue = levelValueOf(sheet.level);
      levelMappings.set(sheet.levelValue, sheet.level);
    }

    song.version = versionMappingList.find(
      ({ dateBefore }) => !dateBefore || song.releaseDate < dateBefore,
    )?.version;

    delete song.imageUrl;
    song.sheets = sheetsOfSong;
    song.isNew = Boolean(song.isNew);
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
    categories: categoryMappingList,
    versions: versionMappingList,
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

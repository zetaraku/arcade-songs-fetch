/* eslint-disable no-await-in-loop */
import fs from 'fs';
import log4js from 'log4js';
import { QueryTypes } from 'sequelize';
import { sequelize } from './models';
import { getSheetSorter } from '../core/utils';

const logger = log4js.getLogger('taiko/gen-json');
logger.level = log4js.levels.INFO;

const DIST_PATH = 'dist/taiko';

const categories = [
  { category: 'ポップス' },
  { category: 'キッズ' },
  { category: 'アニメ' },
  { category: 'ボーカロイド™曲' },
  { category: 'ゲームミュージック' },
  { category: 'バラエティ' },
  { category: 'クラシック' },
  { category: 'ナムコオリジナル' },
  //! add further category here !//
];
const versions = [
  // empty
] as any[];
const types = [
  { type: 'std', name: '表譜面', abbr: '表' },
  { type: 'ura', name: '裏譜面', abbr: '裏', iconUrl: 'type-ura.png', iconHeight: 36 },
];
const difficulties = [
  { difficulty: 'easy', name: 'かんたん', color: '#ff2803', iconUrl: 'difficulty-easy.png', iconHeight: 25 },
  { difficulty: 'normal', name: 'ふつう', color: '#8daf51', iconUrl: 'difficulty-normal.png', iconHeight: 25 },
  { difficulty: 'hard', name: 'むずかしい', color: '#404a2b', iconUrl: 'difficulty-hard.png', iconHeight: 25 },
  { difficulty: 'oni', name: 'おに', color: '#dc1886', iconUrl: 'difficulty-oni.png', iconHeight: 25 },
  { difficulty: 'ura_oni', name: '裏おに', color: '#106479', iconUrl: 'difficulty-ura_oni.png', iconHeight: 25 },
];
const regions = [
  // empty
] as any[];

const sheetSorter = getSheetSorter({ types, difficulties });

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
      sheet.level = `★${sheet.level}`;
    }

    delete song.imageUrl;
    song.sheets = sheetsOfSong;
    song.isNew = Boolean(song.isNew);
    song.isLocked = Boolean(song.isLocked);
  }

  const output = {
    songs,
    categories,
    versions,
    types,
    difficulties,
    regions,
    updateTime: new Date().toISOString(),
  };

  logger.info(`Writing output into ${DIST_PATH}/data.json ...`);
  fs.mkdirSync(DIST_PATH, { recursive: true });
  fs.writeFileSync(`${DIST_PATH}/data.json`, JSON.stringify(output, null, '\t'));

  logger.info('Done!');
}

if (require.main === module) run();

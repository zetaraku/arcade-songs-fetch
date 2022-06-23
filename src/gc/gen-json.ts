/* eslint-disable no-await-in-loop */
import fs from 'fs';
import log4js from 'log4js';
import { QueryTypes } from 'sequelize';
import { sequelize } from './models';
import { getSheetSorter } from '../core/utils';

const logger = log4js.getLogger('gc/gen-json');
logger.level = log4js.levels.INFO;

const DIST_PATH = 'dist/gc';

const categories = [
  { category: 'アニメ・ポップス' },
  { category: 'ボーカロイド' },
  { category: '東方アレンジ' },
  { category: '音楽ゲーム' },
  { category: 'ゲーム' },
  { category: 'バラエティ' },
  { category: 'オリジナル' },
  //! add further category here !//
];
const versions = [
  { dateBefore: '2014-05-26', version: 'GROOVE COASTER', abbr: '[1] GROOVE COASTER' },
  { dateBefore: '2015-01-22', version: 'GROOVE COASTER EX', abbr: '[EX] GROOVE COASTER EX' },
  { dateBefore: '2016-03-10', version: 'HEAVENLY FESTIVAL', abbr: '[2] HEAVENLY FESTIVAL' },
  { dateBefore: '2017-03-16', version: 'LINK FEVER', abbr: '[3] LINK FEVER' },
  { dateBefore: '2018-03-29', version: 'DREAM PARTY', abbr: '[3EX] DREAM PARTY' },
  { dateBefore: '2019-03-28', version: 'STARLIGHT ROAD', abbr: '[4] STARLIGHT ROAD' },
  { dateBefore: '2020-04-09', version: 'INFINITY∞HIGHWAY', abbr: '[4EX] INFINITY∞HIGHWAY' },
  { dateBefore: null, version: 'DIAMOND GALAXY', abbr: '[4MAX] DIAMOND GALAXY' },
  //! add further mapping here !//
];
const types = [
  // empty
] as any[];
const difficulties = [
  { difficulty: 'simple', name: 'SIMPLE', color: '#20dfb6' },
  { difficulty: 'normal', name: 'NORMAL', color: '#f7bb08' },
  { difficulty: 'hard', name: 'HARD', color: '#ff0000' },
  { difficulty: 'extra', name: 'EXTRA', color: '#808080' },
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
    SELECT
      *
    FROM "Songs"
      NATURAL LEFT JOIN "SongExtras"
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

      sheet.levelValue = levelValueOf(sheet.level);
    }

    song.version = versions.find(
      ({ dateBefore }) => !dateBefore || song.releaseDate < dateBefore,
    )?.version;

    delete song.imageUrl;
    song.sheets = sheetsOfSong;
    song.isNew = Boolean(song.isNew);
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

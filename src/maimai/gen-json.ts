/* eslint-disable no-await-in-loop */
import fs from 'fs';
import log4js from 'log4js';
import { QueryTypes } from 'sequelize';
import { sequelize } from './models';

const logger = log4js.getLogger('maimai/gen-json');
logger.level = log4js.levels.INFO;

const DIST_PATH = 'dist/maimai';

const categoryMappingList = [
  { category: 'POPS＆アニメ' },
  { category: 'niconico＆ボーカロイド' },
  { category: '東方Project' },
  { category: 'ゲーム＆バラエティ' },
  { category: 'maimai' },
  { category: 'オンゲキ＆CHUNITHM' },
  //! add further category here !//
];
const versionMappingList = [
  { version: 'maimai', abbr: 'maimai' },
  { version: 'maimai PLUS', abbr: 'maimai+' },
  { version: 'GreeN', abbr: 'GreeN' },
  { version: 'GreeN PLUS', abbr: 'GreeN+' },
  { version: 'ORANGE', abbr: 'ORANGE' },
  { version: 'ORANGE PLUS', abbr: 'ORANGE+' },
  { version: 'PiNK', abbr: 'PiNK' },
  { version: 'PiNK PLUS', abbr: 'PiNK+' },
  { version: 'MURASAKi', abbr: 'MURASAKi' },
  { version: 'MURASAKi PLUS', abbr: 'MURASAKi+' },
  { version: 'MiLK', abbr: 'MiLK' },
  { version: 'MiLK PLUS', abbr: 'MiLK+' },
  { version: 'FiNALE', abbr: 'FiNALE' },
  { version: 'maimaiでらっくす', abbr: 'でらっくす' },
  { version: 'maimaiでらっくす PLUS', abbr: 'でらっくす+' },
  { version: 'Splash', abbr: 'Splash' },
  { version: 'Splash PLUS', abbr: 'Splash+' },
  { version: 'UNiVERSE', abbr: 'UNiVERSE' },
  { version: 'UNiVERSE PLUS', abbr: 'UNiVERSE+' },
  //! add further version here !//
];
const typeMappingList = [
  { type: 'std', name: 'STD（スタンダード）', abbr: 'STD', iconUrl: 'type-std.png', iconHeight: 22 },
  { type: 'dx', name: 'DX（でらっくす）', abbr: 'DX', iconUrl: 'type-dx.png', iconHeight: 22 },
];
const difficultyMappingList = [
  { difficulty: 'basic', name: 'BASIC', color: 'lime' },
  { difficulty: 'advanced', name: 'ADVANCED', color: 'orange' },
  { difficulty: 'expert', name: 'EXPERT', color: 'red' },
  { difficulty: 'master', name: 'MASTER', color: 'darkorchid' },
  { difficulty: 'remaster', name: 'Re:MASTER', color: 'cyan' },
];
const regionMappingList = [
  { region: 'jp', name: '日本版' },
  { region: 'intl', name: '海外版 (International ver.)' },
  { region: 'cn', name: '中国版 (舞萌DX)' },
];

const typeOrder = {
  dx: 1,
  std: 2,
} as Record<string, number>;
const difficultyOrder = {
  basic: 1,
  advanced: 2,
  expert: 3,
  master: 4,
  remaster: 5,
} as Record<string, number>;

function levelValueOf(level: string | null) {
  if (level === null) return null;
  return Number(level.replace('+', '.5'));
}

export default async function run() {
  const levelMappings = new Map();

  logger.info('Loading songs from database ...');
  const songs: any[] = await sequelize.query(/* sql */ `
    SELECT
      *
    FROM "Songs"
      NATURAL LEFT JOIN "SongExtras"
  `, {
    type: QueryTypes.SELECT,
  });

  logger.info('Loading sheets from database ...');
  for (const song of songs) {
    const sheetsOfSong: any[] = await sequelize.query(/* sql */ `
      SELECT
        *,
        "JpSheets"."title" IS NOT NULL AS "regions.jp",
        "IntlSheets"."title" IS NOT NULL AS "regions.intl",
        "CnSheets"."title" IS NOT NULL AS "regions.cn"
      FROM "Sheets"
        NATURAL LEFT JOIN "SheetVersions"
        NATURAL LEFT JOIN "SheetExtras"
        NATURAL LEFT JOIN "JpSheets"
        NATURAL LEFT JOIN "IntlSheets"
        NATURAL LEFT JOIN "CnSheets"
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

      for (const region of Object.keys(sheet.regions)) {
        sheet.regions[region] = Boolean(sheet.regions[region]);
      }

      sheet.noteCounts = {
        tap: sheet.tapCount,
        hold: sheet.holdCount,
        slide: sheet.slideCount,
        touch: sheet.touchCount,
        break: sheet.breakCount,
        total: sheet.totalCount,
      };
      delete sheet.tapCount;
      delete sheet.holdCount;
      delete sheet.slideCount;
      delete sheet.touchCount;
      delete sheet.breakCount;
      delete sheet.totalCount;
    }

    delete song.imageUrl;
    song.sheets = sheetsOfSong;
    song.isNew = Boolean(song.isNew);
    song.isLocked = Boolean(song.isLocked);
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

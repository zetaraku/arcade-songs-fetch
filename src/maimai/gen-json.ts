/* eslint-disable no-await-in-loop */
import fs from 'fs';
import log4js from 'log4js';
import { QueryTypes } from 'sequelize';
import { sequelize } from './models';
import { getSheetSorter } from '../core/utils';

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
  { category: '宴会場' },
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
  { type: 'dx', name: 'DX（でらっくす）', abbr: 'DX', iconUrl: 'type-dx.png', iconHeight: 22 },
  { type: 'std', name: 'STD（スタンダード）', abbr: 'STD', iconUrl: 'type-std.png', iconHeight: 22 },
  { type: 'utage', name: '宴（宴会場）', abbr: '宴' },
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

const sheetSorter = getSheetSorter({ typeMappingList, difficultyMappingList });

function levelValueOf(level: string | null) {
  if (level === null) return null;
  if (level === '*') return -1;
  return Number(level.replace('+', '.5'));
}

export default async function run() {
  logger.info('Loading songs from database ...');
  const songs: Record<string, any>[] = await sequelize.query(/* sql */ `
    SELECT
      *
    FROM "Songs"
      NATURAL LEFT JOIN "SongExtras"
    ORDER BY "sortOrder"
  `, {
    type: QueryTypes.SELECT,
  });

  logger.info('Loading sheets from database ...');
  for (const song of songs) {
    const sheetsOfSong = sheetSorter.sorted(
      await sequelize.query(/* sql */ `
        SELECT
          *,
          "JpSheets"."songId" IS NOT NULL AS "regions.jp",
          "IntlSheets"."songId" IS NOT NULL AS "regions.intl",
          "CnSheets"."songId" IS NOT NULL AS "regions.cn"
        FROM "Sheets"
          NATURAL LEFT JOIN "SheetVersions"
          NATURAL LEFT JOIN "SheetExtras"
          NATURAL LEFT JOIN "JpSheets"
          NATURAL LEFT JOIN "IntlSheets"
          NATURAL LEFT JOIN "CnSheets"
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
      if (sheet.version == null) delete sheet.version;

      if (sheet.type === 'utage') {
        sheet.difficulty = `【${sheet.difficulty}】`;
        sheet.isSpecial = true;
      }

      sheet.levelValue = levelValueOf(sheet.level);

      for (const region of Object.keys(sheet.regions)) {
        sheet.regions[region] = Boolean(sheet.regions[region]);
      }
    }

    delete song.imageUrl;
    delete song.releaseNo;
    song.sheets = sheetsOfSong;
    song.isNew = Boolean(song.isNew);
    song.isLocked = Boolean(song.isLocked);
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

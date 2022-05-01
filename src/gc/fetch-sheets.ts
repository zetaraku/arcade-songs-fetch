/* eslint-disable no-await-in-loop */
import axios from 'axios';
import log4js from 'log4js';
import sleep from 'sleep-promise';
import * as cheerio from 'cheerio';
import { QueryTypes } from 'sequelize';
import { sequelize, SongExtra, Sheet } from './models';

const logger = log4js.getLogger('gc/fetch-sheets');
logger.level = log4js.levels.INFO;

const DATA_URL = 'https://groovecoaster.jp/music';

async function fetchSongExtra(song: Record<string, any>) {
  const response = await axios.get(`${DATA_URL}/${song.songId}.html`);
  const $ = cheerio.load(response.data);

  const bpm = Number.parseFloat($('.param-block .details ul .bpm').text()) || null;

  const levels = $('.param-block .difficulty ul li').toArray()
    .map((ul) => $(ul).find('img').attr('src')!.match(/\/img\/music\/img_dif_(\d+).png/)![1]);

  return {
    songId: song.songId,

    category: song.category,
    title: song.title,

    bpm,

    level_simple: levels[0],
    level_normal: levels[1],
    level_hard: levels[2],
    level_extra: levels[3],
  };
}

function extractSheets(songExtra: Record<string, any>) {
  return [
    { type: 'std', difficulty: 'simple', level: songExtra.level_simple },
    { type: 'std', difficulty: 'normal', level: songExtra.level_normal },
    { type: 'std', difficulty: 'hard', level: songExtra.level_hard },
    { type: 'std', difficulty: 'extra', level: songExtra.level_extra },
  ].filter((e) => !!e.level).map((rawSheet) => ({
    songId: songExtra.songId,
    category: songExtra.category,
    title: songExtra.title,
    ...rawSheet,
  }));
}

export default async function run() {
  logger.info('Preparing SongExtras table ...');
  await SongExtra.sync();

  logger.info('Preparing Sheets table ...');
  await Sheet.sync();

  const songsToFetch: Record<string, any>[] = await sequelize.query(/* sql */ `
    SELECT "songId", "category", "title"
    FROM "Songs" LEFT JOIN "SongExtras" USING ("songId")
    WHERE ("SongExtras"."bpm" IS NULL)
      UNION
    SELECT "songId", "Songs"."category", "Songs"."title"
    FROM "Songs" LEFT JOIN "Sheets" USING ("songId")
    WHERE ("Sheets"."songId" IS NULL)
      UNION
    SELECT "songId", "Songs"."category", "Songs"."title"
    FROM "Songs" LEFT JOIN (SELECT * FROM "Sheets" WHERE "difficulty" = 'extra') AS "Sheets" USING ("songId")
    WHERE ("Songs"."hasEx") AND ("Sheets"."songId" IS NULL)
  `, {
    type: QueryTypes.SELECT,
  });
  logger.info(`Found ${songsToFetch.length} page(s) to fetch.`);

  for (const [index, song] of songsToFetch.entries()) {
    try {
      logger.info(`(${1 + index} / ${songsToFetch.length}) Updating extra & sheets for: ${song.title} ...`);
      const songExtra = await fetchSongExtra(song);
      const sheets = extractSheets(songExtra);

      await SongExtra.upsert(songExtra);
      await Promise.all(sheets.map((sheet) => Sheet.upsert(sheet)));
    } catch (e: any) {
      logger.error(e.message);
    } finally {
      await sleep(500);
    }
  }

  logger.info('Done!');
}

if (require.main === module) run();

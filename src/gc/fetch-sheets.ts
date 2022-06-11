/* eslint-disable no-await-in-loop */
import axios from 'axios';
import log4js from 'log4js';
import sleep from 'sleep-promise';
import * as cheerio from 'cheerio';
import { QueryTypes } from 'sequelize';
import { sequelize, SongExtra, Sheet } from './models';

const logger = log4js.getLogger('gc/fetch-sheets');
logger.level = log4js.levels.INFO;

async function fetchSongExtra(song: Record<string, any>) {
  const response = await axios.get(song.detailUrl);
  const $ = cheerio.load(response.data);

  const bpm = Number.parseFloat($('.param-block .details ul .bpm').text().trim()) || null;

  const levels = $('.param-block .difficulty ul li').toArray()
    .map((ul) => $(ul).find('img').attr('src')!.match(/\/img\/music\/img_dif_(\d+).png/)![1]);

  return {
    songId: song.songId,

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
    ...rawSheet,
  }));
}

export default async function run() {
  logger.info('Preparing SongExtras table ...');
  await SongExtra.sync();

  logger.info('Preparing Sheets table ...');
  await Sheet.sync();

  const songsToFetch: Record<string, any>[] = await sequelize.query(/* sql */ `
    SELECT "songId", "title", "detailUrl"
    FROM "Songs" NATURAL LEFT JOIN "Sheets"
    WHERE ("Sheets"."songId" IS NULL)
      UNION
    SELECT "songId", "title", "detailUrl"
    FROM "Songs" NATURAL LEFT JOIN (SELECT * FROM "Sheets" WHERE "difficulty" = 'extra') AS "ExSheets"
    WHERE ("Songs"."hasEx") AND ("ExSheets"."songId" IS NULL)
      UNION
    SELECT "songId", "title", "detailUrl"
    FROM "Songs" NATURAL LEFT JOIN "SongExtras"
    WHERE ("SongExtras"."bpm" IS NULL)
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

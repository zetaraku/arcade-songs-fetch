/* eslint-disable no-await-in-loop */
import axios from 'axios';
import Sequelize from 'sequelize';
import sleep from 'sleep-promise';
import log4js from 'log4js';
import * as cheerio from 'cheerio';
import { wikiwikiWikiTitleEscape } from '@/_core/utils';
import { sequelize, SongExtra, SheetExtra } from '@@/db/ongeki/models';

const logger = log4js.getLogger('ongeki/fetch-extras');
logger.level = log4js.levels.INFO;

const DATA_URL = 'https://wikiwiki.jp/gameongeki';

const difficultyMap = new Map([
  ['BASIC', 'basic'],
  ['ADVANCED', 'advanced'],
  ['EXPERT', 'expert'],
  ['MASTER', 'master'],
  ['LUNATIC', 'lunatic'],
  //! add further difficulty here !//
]);

function getSongWikiUrl(song: Record<string, any>) {
  const title = (() => {
    //! hotfix
    const manualMappings = new Map([
      // resolve same title
      ['Singularity', 'Singularity - technoplanet'],
      ['Singularity (2)', 'Singularity - ETIA.'],
      ['Singularity (3)', 'Singularity - SEGA SOUND STAFF「セガNET麻雀 MJ」'],
      ['Hand in Hand', 'Hand in Hand - ユーフィリア(CV：高橋 李依)'],
      ['Hand in Hand (2)', 'Hand in Hand - livetune'],
      // resolve title inconsistency
      ['Dramatic…?', 'Dramatic…？'],
      ['God knows…', 'God knows...'],
      ['Help me, ERINNNNNN!!（Band ver.）', 'Help me, ERINNNNNN!!'],
      ['Memories of O.N.G.E.K.I.', 'Memories of O.N.G.E.K.I.（楽曲）'],
      ['Opera of the wasteland', 'Opera of the wastrland'],
      ['Re:StarT (2023ver.)', 'Re：StarT(2023ver.)'],
      ['Red “reduction division” -crossroads version-', 'Red ”reduction division” -crossroads version-'],
      ['[HALO]', 'HALO'],
      ['sister’s noise', 'sister\'s noise'],
      ['かくしん的☆めたまるふぉ～ぜっ!', 'かくしん的☆めたまるふぉ～ぜっ！'],
      ['めんどーい！やっほーい！ともだち！  -井之原 小星ソロver.-', 'めんどーい！やっほーい！ともだち！ -井之原 小星ソロver.-'],
      ['めんどーい！やっほーい！ともだち！  -柏木 咲姫ソロver.-', 'めんどーい！やっほーい！ともだち！ -柏木 咲姫ソロver.-'],
    ]);

    if (manualMappings.has(song.songId)) {
      return manualMappings.get(song.songId);
    }

    return song.title;
  })();

  const encodedTitle = encodeURIComponent(wikiwikiWikiTitleEscape(title));

  return `${DATA_URL}/${encodedTitle}`;
}

function extractSheetExtras($: cheerio.CheerioAPI, table: cheerio.Element) {
  const trs = $(table).find('tbody > tr').toArray();
  return trs.map((tr) => {
    const tds = $(tr).find('th, td').toArray();
    const tdsData = tds.map((e) => $(e).text().trim());

    const [
      difficultyText, /* level */, totalCount, bellCount, /* internalLevel */, noteDesigner,
    ] = tdsData;

    const difficulty = difficultyMap.get(difficultyText);

    if (difficulty === undefined) {
      throw new Error(`'${difficultyText}' is not a valid difficulty text.`);
    }

    const parseNoteCount = (text: string) => {
      const result = Number.parseInt(text.replaceAll(',', ''), 10);
      return !Number.isNaN(result) ? result : null;
    };

    return {
      type: 'std',
      difficulty,

      'noteCounts.bell': parseNoteCount(bellCount),
      'noteCounts.total': parseNoteCount(totalCount),

      noteDesigner: noteDesigner || (['basic', 'advanced'].includes(difficulty) ? '-' : null),
    };
  }).filter((e) => e.difficulty !== 'lunatic');
}

async function fetchExtra(song: Record<string, any>, pageUrl: string) {
  const response = await axios.get(pageUrl);
  const $ = cheerio.load(response.data);

  const bpm = Number.parseFloat($('th:contains("BPM")').next().text().trim()) || null;

  const songExtra = {
    songId: song.songId,
    bpm,
  };

  const sheetExtras = [
    $('h2:contains("詳細") + div > table').get(0),
  ].filter((e) => e !== undefined).flatMap(
    (table) => extractSheetExtras($, table).map(
      (sheetExtra) => ({
        songId: song.songId,
        ...sheetExtra,
      }),
    ),
  );

  if (sheetExtras.length === 0) {
    throw new Error(`No sheet extras found for song: ${song.title}`);
  }

  return {
    songExtra,
    sheetExtras,
  };
}

export default async function run() {
  const songsToFetch: Record<string, any>[] = await sequelize.query(/* sql */ `
    SELECT "songId", "category", "title"
    FROM (
      SELECT DISTINCT "songId"
      FROM "Songs" LEFT JOIN "SongExtras" USING ("songId")
      WHERE (FALSE
        OR "SongExtras"."bpm" IS NULL
      ) AND "category" <> 'LUNATIC'
        UNION
      SELECT DISTINCT "songId"
      FROM "Sheets" LEFT JOIN "SheetExtras" USING ("songId", "type", "difficulty")
      WHERE (FALSE
        OR "noteCounts.bell" IS NULL
        OR "noteCounts.total" IS NULL
        OR "noteDesigner" IS NULL
      ) AND "type" <> 'lun'
    ) NATURAL LEFT JOIN "Songs"
  `, {
    type: Sequelize.QueryTypes.SELECT,
  });
  logger.info(`Found ${songsToFetch.length} page(s) to fetch.`);

  for (const [index, song] of songsToFetch.entries()) {
    try {
      logger.info(`(${1 + index} / ${songsToFetch.length}) Fetching & Updating extra: ${song.title} ...`);
      const pageUrl = getSongWikiUrl(song);

      const { songExtra, sheetExtras } = await fetchExtra(song, pageUrl);

      await SongExtra.upsert(songExtra);
      await Promise.all(sheetExtras.map((sheetExtra) => SheetExtra.upsert(sheetExtra)));
    } catch (e: any) {
      logger.error(e.message);
    } finally {
      await sleep(500);
      // sleep for extra 60 seconds per 30 requests (rate limit from wikiwiki)
      if ((1 + index) % 30 === 0) await sleep(60 * 1000);
    }
  }

  logger.info('Done!');
}

if (require.main === module) run();

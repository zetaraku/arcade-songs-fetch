/* eslint-disable no-await-in-loop */
/* eslint-disable newline-per-chained-call */
import axios from 'axios';
import Sequelize from 'sequelize';
import sleep from 'sleep-promise';
import log4js from 'log4js';
import * as cheerio from 'cheerio';
import { wikiwikiWikiTitleEscape } from '@/_core/utils';
import { sequelize, SheetExtra } from '@@/db/chunithm/models';

const logger = log4js.getLogger('chunithm/fetch-sheet-extras-v2');
logger.level = log4js.levels.INFO;

const DATA_URL = 'https://wikiwiki.jp/chunithmwiki';

const difficultyMap = new Map([
  ['#c0ff20', 'basic'],
  ['#ffe080', 'advanced'],
  ['#ffa0c0', 'expert'],
  ['#c0a0ff', 'master'],
  ['#ff1c33', 'ultima'],
  ['black', null], // 'we'
  ['gray', null], // 'we'
  ['grey', null], // 'we'
  //! add further difficulty here !//
]);

function getSongWikiUrl(song: Record<string, any>) {
  const title = (() => {
    //! hotfix
    const manualMappings = new Map([
      ['#SUP3RORBITAL', '♯SUP3RORBITAL'],
      ['U&iVERSE -銀河鸞翔-', 'U＆iVERSE ‐銀河鸞翔‐'],
      [']-[|/34<#!', 'ヒバチ'],
      ['ウルガレオン', 'ウルガレオン(楽曲名)'],
      ['トリスメギストス', 'トリスメギストス(楽曲名)'],
      ['紅', '紅(楽曲名)'],
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
  const trs = $(table).find('tr').toArray().slice(2);
  return trs.map((tr) => {
    const tds = $(tr).find('th, td').toArray();
    const tdsData = tds.map((e) => $(e).text().trim());

    const difficultyColor = tds[0].attribs.style.match('background-color:(#[0-9a-f]+|[a-z]+)')![1];

    const [
      /* level */,
      totalCount, tapCount, holdCount, slideCount, airCount, flickCount,
    ] = tdsData;

    const difficulty = difficultyMap.get(difficultyColor);

    if (difficulty === undefined) {
      throw new Error(`'${difficultyColor}' is not a valid difficulty color.`);
    }

    const noteDesigner = (() => {
      const nodes = $(table).parent().next('p:contains("譜面作者")').find('span').contents().toArray();

      const extractNoteDesigner = (abbr: string) => {
        const anchorIndex = nodes.findIndex((node) => $(node).text().trim() === abbr);
        if (anchorIndex === -1) return null;

        let result = $(nodes[anchorIndex + 1]).text().trim().replace(/^[…]|[】]$|[、](WE.*)?$/g, '').trim();

        //! hotfix
        result = result.replace('ロシェ@', 'ロシェ＠');
        result = result.replace('Revo＠', 'Revo@');

        return !!result && result !== '？' && result !== '?' ? result : null;
      };

      if (difficulty === 'basic') return '-';
      if (difficulty === 'advanced') return '-';
      if (difficulty === 'expert') return extractNoteDesigner('EXP');
      if (difficulty === 'master') return extractNoteDesigner('MAS');
      if (difficulty === 'ultima') return extractNoteDesigner('ULT');

      return null;
    })();

    const parseNoteCount = (text: string) => {
      const result = Number.parseInt(text.replaceAll(',', ''), 10);
      return !Number.isNaN(result) ? result : null;
    };

    return {
      type: 'std',
      difficulty,

      'noteCounts.tap': parseNoteCount(tapCount),
      'noteCounts.hold': parseNoteCount(holdCount),
      'noteCounts.slide': parseNoteCount(slideCount),
      'noteCounts.air': parseNoteCount(airCount),
      'noteCounts.flick': parseNoteCount(flickCount),
      'noteCounts.total': parseNoteCount(totalCount),

      noteDesigner,
    };
  }).filter((e) => e.difficulty !== null);
}

async function fetchExtra(song: Record<string, any>, pageUrl: string) {
  const response = await axios.get(pageUrl);
  const $ = cheerio.load(response.data);

  const sheetExtras = [
    $('h2:contains("詳細") + div > table').get(0),
    $('h2:contains("詳細") + p + div > table').get(0),
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
    sheetExtras,
  };
}

export default async function run() {
  const songsToFetch: Record<string, any>[] = await sequelize.query(/* sql */ `
    SELECT "songId", "category", "title"
    FROM (
      SELECT DISTINCT "songId"
      FROM "Sheets"
        LEFT JOIN "SheetExtras" USING ("songId", "type", "difficulty")
      WHERE (FALSE
        OR "noteCounts.tap" IS NULL
        OR "noteCounts.hold" IS NULL
        OR "noteCounts.slide" IS NULL
        OR "noteCounts.air" IS NULL
        -- OR "noteCounts.flick" IS NULL
        OR "noteCounts.total" IS NULL
        OR (0
          + "noteCounts.tap"
          + "noteCounts.hold"
          + "noteCounts.slide"
          + "noteCounts.air"
          + COALESCE("noteCounts.flick", 0)
        ) <> "noteCounts.total"
        OR ("noteDesigner" IS NULL)
      ) AND (
        "type" <> 'we'
      )
    ) NATURAL LEFT JOIN "Songs"
  `, {
    type: Sequelize.QueryTypes.SELECT,
  });
  logger.info(`Found ${songsToFetch.length} page(s) to fetch.`);

  for (const [index, song] of songsToFetch.entries()) {
    try {
      logger.info(`(${1 + index} / ${songsToFetch.length}) Fetching & Updating extra: ${song.title} ...`);
      const pageUrl = getSongWikiUrl(song);

      const { sheetExtras } = await fetchExtra(song, pageUrl);

      await Promise.all(sheetExtras.map((sheetExtra) => SheetExtra.upsert(sheetExtra)));
    } catch (e: any) {
      logger.error(e.message);
    } finally {
      await sleep(500);
    }
  }

  logger.info('Done!');
}

if (require.main === module) run();

/* eslint-disable no-await-in-loop */
import axios from 'axios';
import Sequelize from 'sequelize';
import sleep from 'sleep-promise';
import log4js from 'log4js';
import * as cheerio from 'cheerio';
import { gamerchWikiTitleEscape } from '@/_core/utils';
import { sequelize, SongExtra, SheetExtra } from '@@/db/maimai/models';

const logger = log4js.getLogger('maimai/fetch-extras-v2');
logger.level = log4js.levels.INFO;

const DATA_URL = 'https://maimai.gamerch.com';

const difficultyMap = new Map([
  ['#00ced1', 'easy'],
  ['#98fb98', 'basic'],
  ['#ffa500', 'advanced'],
  ['#fa8080', 'expert'],
  ['#ee82ee', 'master'],
  ['#ffceff', 'remaster'],
  ['#ff5296', 'utage'],
  //! add further difficulty here !//
]);

function getSongWikiUrl(song: Record<string, any>) {
  const title = (() => {
    //! hotfix
    if (song.songId === 'Link (2)') {
      return 'Link（Circle of friends）';
    }
    if (song.songId === 'YA･DA･YO [Reborn]') {
      return 'YA・DA・YO [Reborn]';
    }
    if (song.songId === 'D✪N’T  ST✪P  R✪CKIN’') {
      return 'D✪N’T ST✪P R✪CKIN’';
    }
    if (song.songId === '　') {
      return '\u200E';
    }

    return song.title;
  })();

  const encodedTitle = encodeURIComponent(gamerchWikiTitleEscape(title));

  return `${DATA_URL}/${encodedTitle}`;
}

function extractSheetExtras($: cheerio.CheerioAPI, table: cheerio.Element) {
  // eslint-disable-next-line newline-per-chained-call
  const noInternalLevel = ($(table).find('tr').eq(0).find('th').eq(1).text().trim() === '総数');

  const type = (() => {
    // eslint-disable-next-line newline-per-chained-call
    const fourthNoteType = $(table).find('tr').eq(1).find('th').eq(3).text().trim();
    if (fourthNoteType === 'Break') return 'std';
    if (fourthNoteType === 'Touch') return 'dx';
    throw new Error('Unknown type.');
  })();

  const trs = $(table).find('tr').toArray().slice(2);
  return trs.map((tr) => {
    const tds = $(tr).find('th, td').toArray();
    const tdsData = tds.map((e) => $(e).text().trim());

    if (noInternalLevel) {
      tdsData.splice(1, 0, '');
    }
    if (type === 'std') {
      tdsData.splice(6, 0, '');
    }

    const difficultyColor = tds[0].attribs.style.match('background:(#[0-9a-f]+)')![1];

    const [
      /* level */, /* internalLevel */,
      totalCount, tapCount, holdCount, slideCount, touchCount, breakCount,
    ] = tdsData;

    const difficulty = difficultyMap.get(difficultyColor);

    if (difficulty === undefined) {
      throw new Error(`'${difficultyColor}' is not a valid difficulty color.`);
    }

    const noteDesigner = (() => {
      const nodes = $(table).next('span:contains("譜面作者")').contents().toArray();

      const extractNoteDesigner = (abbr: string) => {
        const anchorIndex = nodes.findIndex((node) => $(node).text().trim() === abbr);
        if (anchorIndex === -1) return null;

        const result = $(nodes[anchorIndex + 1]).text().trim().replace(/^[…]|[、】]$/g, '');
        return !!result && result !== '？' && result !== '?' ? result : null;
      };

      if (difficulty === 'easy') return '-';
      if (difficulty === 'basic') return '-';
      if (difficulty === 'advanced') return '-';
      if (difficulty === 'expert') return extractNoteDesigner('EXP');
      if (difficulty === 'master') return extractNoteDesigner('MAS') ?? extractNoteDesigner('MST');
      if (difficulty === 'remaster') return extractNoteDesigner('Re:M');

      return null;
    })();

    const parseNoteCount = (text: string) => {
      const result = Number.parseInt(text.replaceAll(',', ''), 10);
      return !Number.isNaN(result) ? result : null;
    };

    return {
      type,
      difficulty,

      'noteCounts.tap': parseNoteCount(tapCount),
      'noteCounts.hold': parseNoteCount(holdCount),
      'noteCounts.slide': parseNoteCount(slideCount),
      'noteCounts.touch': parseNoteCount(touchCount),
      'noteCounts.break': parseNoteCount(breakCount),
      'noteCounts.total': parseNoteCount(totalCount),

      noteDesigner,
    };
  });
}

async function fetchExtra(song: Record<string, any>) {
  const pageUrl = getSongWikiUrl(song);

  const response = await axios.get(pageUrl);
  const $ = cheerio.load(response.data);

  const bpm = Number.parseFloat($('th:contains("BPM")').next().text().trim()) || null;
  const date = $('th:contains("配信日")').next().text().trim() || '';

  const dateMatch = date.match(/^(\d{4})\/(\d{2})\/(\d{2})/);
  const releaseDate = dateMatch !== null ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}` : null;

  const songExtra = {
    songId: song.songId,
    bpm,
    releaseDate,
  };

  const sheetExtras = [
    $('.ui_anchor_container:contains("譜面データ") + table').get(0),
    $('.ui_anchor_container:contains("スタンダード譜面") + table').get(0),
    $('.ui_anchor_container:contains("でらっくす譜面") + table').get(0),
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
      SELECT "songId"
      FROM "Songs" LEFT JOIN "SongExtras" USING ("songId")
      WHERE ("bpm" IS NULL)
        UNION
      SELECT DISTINCT "songId"
      FROM "Sheets" NATURAL LEFT JOIN "SheetExtras"
      WHERE ("noteCounts.total" IS NULL) OR ("noteDesigner" IS NULL)
    ) NATURAL LEFT JOIN "Songs"
    WHERE "category" <> '宴会場'
  `, {
    type: Sequelize.QueryTypes.SELECT,
  });
  logger.info(`Found ${songsToFetch.length} page(s) to fetch.`);

  for (const [index, song] of songsToFetch.entries()) {
    try {
      logger.info(`(${1 + index} / ${songsToFetch.length}) Fetching & Updating extra: ${song.title} ...`);
      const { songExtra, sheetExtras } = await fetchExtra(song);

      await SongExtra.upsert(songExtra);
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

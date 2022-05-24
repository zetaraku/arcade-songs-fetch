/* eslint-disable no-await-in-loop */
import axios from 'axios';
import sleep from 'sleep-promise';
import log4js from 'log4js';
import * as cheerio from 'cheerio';
import { QueryTypes } from 'sequelize';
import { sequelize, SongExtra, SheetExtra } from './models';

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
    if (song.title === 'Link (2)') {
      return 'Link（Circle of friends）';
    }
    if (song.title === 'YA･DA･YO [Reborn]') {
      return 'YA・DA・YO [Reborn]';
    }
    if (song.title === 'D✪N’T  ST✪P  R✪CKIN’') {
      return 'D✪N’T ST✪P R✪CKIN’';
    }
    if (song.title === '　') {
      return '\u200E';
    }

    return song.title;
  })();

  const encodedTitle = encodeURIComponent(
    title
      .replaceAll('+', '＋')
      .replaceAll('[', '［')
      .replaceAll(']', '］')
      .replaceAll('#', '＃')
      .replaceAll('&', '＆')
      .replaceAll('?', '？')
      .replaceAll('>', '＞')
      .replaceAll(':', '：')
    ,
  );

  return `${DATA_URL}/${encodedTitle}`;
}

function extractSheetExtras($: cheerio.CheerioAPI, table: cheerio.Element) {
  const type = (() => {
    const fourthNoteType = $(table).find('tr').eq(1).find('th').eq(3).text().trim();
    if (fourthNoteType === 'Break') return 'std';
    if (fourthNoteType === 'Touch') return 'dx';
    throw new Error('Unknown type.');
  })();

  const trs = $(table).find('tr').toArray().slice(2);
  return trs.map((tr) => {
    const tds = $(tr).find('th, td').toArray();
    const tdsData = tds.map((e) => $(e).text().trim());

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
        return !!result && result !== '？' ? result : null;
      };

      if (difficulty === 'easy') return '-';
      if (difficulty === 'basic') return '-';
      if (difficulty === 'advanced') return '-';
      if (difficulty === 'expert') return extractNoteDesigner('EXP');
      if (difficulty === 'master') return extractNoteDesigner('MAS');
      if (difficulty === 'remaster') return extractNoteDesigner('Re:M');

      return null;
    })();

    const extractNoteCount = (noteCount: string) => Number.parseInt(noteCount.replaceAll(',', ''), 10);

    return {
      type,
      difficulty,

      tapCount: extractNoteCount(tapCount),
      holdCount: extractNoteCount(holdCount),
      slideCount: extractNoteCount(slideCount),
      touchCount: extractNoteCount(touchCount),
      breakCount: extractNoteCount(breakCount),
      totalCount: extractNoteCount(totalCount),

      noteDesigner,
    };
  });
}

async function fetchExtra(song: Record<string, any>) {
  const pageUrl = getSongWikiUrl(song);

  const response = await axios.get(pageUrl);
  const $ = cheerio.load(response.data);

  const bpm = Number.parseFloat($('th:contains("BPM")').next().text().trim()) || null;

  const songExtra = {
    category: song.category,
    title: song.title,

    bpm,
  };

  const sheetExtras = [
    $('.ui_anchor_container:contains("スタンダード譜面") + table').get(0),
    $('.ui_anchor_container:contains("でらっくす譜面") + table').get(0),
  ].filter((e) => e !== undefined).flatMap(
    (table) => extractSheetExtras($, table).map(
      (sheetExtra) => ({
        category: song.category,
        title: song.title,
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
  logger.info('Preparing SongExtras table ...');
  await SongExtra.sync();

  logger.info('Preparing SheetExtras table ...');
  await SheetExtra.sync();

  let songsToFetch: Record<string, any>[] = await sequelize.query(/* sql */ `
    SELECT "category", "title"
    FROM "Songs" LEFT JOIN "SongExtras" USING ("category", "title")
    WHERE ("bpm" IS NULL)
      UNION
    SELECT DISTINCT "category", "title"
    FROM "Sheets" LEFT JOIN "SheetExtras" USING ("category", "title", "type", "difficulty")
    WHERE ("totalCount" IS NULL) OR ("noteDesigner" IS NULL)
  `, {
    type: QueryTypes.SELECT,
  });
  songsToFetch = songsToFetch.filter((song) => song.category !== '宴会場');
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

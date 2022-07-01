/* eslint-disable no-await-in-loop */
import axios from 'axios';
import sleep from 'sleep-promise';
import log4js from 'log4js';
import * as cheerio from 'cheerio';
import { QueryTypes } from 'sequelize';
import { sequelize, SongExtra, SheetExtra } from '@@/db/maimai/models';

const logger = log4js.getLogger('maimai/fetch-extras-v1');
logger.level = log4js.levels.INFO;

// const DATA_URL = 'http://maimai.wiki.fc2.com/wiki';
const DATA_URL = 'https://web.archive.org/web/20200718222454/http://maimai.wiki.fc2.com/wiki';

const difficultyMap = new Map([
  ['B', 'basic'],
  ['A', 'advanced'],
  ['E', 'expert'],
  ['M', 'master'],
  ['R', 'remaster'],
  ['ESY', 'easy'],
  ['BSC', 'basic'],
  ['ADV', 'advanced'],
  ['EXP', 'expert'],
  ['MST', 'master'],
  ['Re:M', 'remaster'],
  //! add further difficulty here !//
]);

function getSongWikiUrl(song: Record<string, any>) {
  const title = (() => {
    //! hotfix
    if (song.songId === 'Link (2)') {
      return 'Link(Circle of friends)';
    }
    if (song.songId === 'YA･DA･YO [Reborn]') {
      return 'YA・DA・YO [Reborn]';
    }
    if (song.songId === 'D✪N’T  ST✪P  R✪CKIN’') {
      return 'D✪N’T ST✪P R✪CKIN’';
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
    const typeOfNotes = $(table).find('tr').eq(1).find('th').length;
    if (typeOfNotes === 4) return 'std';
    if (typeOfNotes === 5) return 'dx';
    throw new Error('Unknown type.');
  })();

  const trs = $(table).find('tr').toArray().slice(2);
  return trs.map((tr) => {
    const tds = $(tr).find('td').toArray();
    const tdsData = tds.map((e) => $(e).text().trim());

    if (type === 'std') {
      tdsData.splice(6, 0, '');
    }

    const [
      difficultyAbbr, /* level */,
      totalCount, tapCount, holdCount, slideCount, touchCount, breakCount,
      noteDesigner,
    ] = tdsData;

    const difficulty = difficultyMap.get(difficultyAbbr);

    if (difficulty === undefined) {
      logger.warn(`'${difficultyAbbr}' is not a valid difficulty.`);
    }

    const parseNoteCount = (text: string) => {
      const result = Number.parseInt(text, 10);
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

      noteDesigner: noteDesigner || null,
    };
  });
}

async function fetchExtra(song: Record<string, any>) {
  const pageUrl = getSongWikiUrl(song);

  const response = await axios.get(pageUrl);
  const $ = cheerio.load(response.data);

  if ($('.style_message:contains("見つかりませんでした")').length !== 0) {
    throw new Error(`Page of '${song.title}' not found.`);
  }

  const bpm = Number.parseFloat($('td:contains("BPM")').next().text().trim()) ?? null;

  const songExtra = {
    songId: song.songId,
    bpm,
  };

  const sheetExtras = [
    $('h2:contains("譜面情報") + div table').get(0),
    $('h3:contains("スタンダード譜面") + div table').get(0),
    $('h3:contains("でらっくす譜面") + div table').get(0),
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
      FROM "Sheets" LEFT JOIN "SheetExtras" USING ("songId", "type", "difficulty")
      WHERE ("noteCounts.total" IS NULL) OR ("noteDesigner" IS NULL)
    ) LEFT JOIN "Songs" USING ("songId")
    WHERE "category" <> '宴会場'
  `, {
    type: QueryTypes.SELECT,
  });
  logger.info(`Found ${songsToFetch.length} page(s) to fetch.`);

  for (const [index, song] of songsToFetch.entries()) {
    try {
      logger.info(`(${1 + index} / ${songsToFetch.length}) Updating extra for: ${song.title} ...`);
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

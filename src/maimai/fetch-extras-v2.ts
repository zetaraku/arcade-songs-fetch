/* eslint-disable no-await-in-loop */
/* eslint-disable newline-per-chained-call */
import axios from 'axios';
import Sequelize from 'sequelize';
import sleep from 'sleep-promise';
import log4js from 'log4js';
import * as cheerio from 'cheerio';
import { gamerchWikiV2TitleEscape } from '@/_core/utils';
import { sequelize, SongExtra, SheetExtra } from '@@/db/maimai/models';

const logger = log4js.getLogger('maimai/fetch-extras-v2');
logger.level = log4js.levels.INFO;

const SONG_LIST_URL = 'https://gamerch.com/maimai/entry/545589';

const difficultyMap = new Map([
  ['#00ced1', null], // 'easy'
  ['#98fb98', 'basic'],
  ['#ffa500', 'advanced'],
  ['#fa8080', 'expert'],
  ['#ee82ee', 'master'],
  ['#ffceff', 'remaster'],
  ['#ff5296', null], // 'utage'
  //! add further difficulty here !//
]);

export function getSongWikiTitle(song: Record<string, any>) {
  const title = (() => {
    //! hotfix
    const manualMappings = new Map([
      ['+♂', '♂'],
      ['BOUNCE & DANCE', 'BOUNCE ＆ DANCE'],
      ['Bad Apple!! feat.nomico (REDALiCE Remix)', 'Bad Apple！！ feat.nomico （REDALiCE Remix）'],
      ['Bad Apple!! feat.nomico', 'Bad Apple feat nomico'],
      ['Choo Choo TRAIN', 'Choo Choo Train'],
      ['DETARAME ROCK&ROLL THEORY', 'DETARAME ROCK＆ROLL THEORY'],
      ['D✪N’T  ST✪P  R✪CKIN’', 'D✪N’T ST✪P R✪CKIN’'],
      ['GET!! 夢&DREAM', 'GET 夢＆DREAM'],
      ['GO MY WAY!!', 'GO MY WAY！！'],
      ['GO!!!', 'GO！！！'],
      ['Help me, ERINNNNNN!!（Band ver.）', 'Help me, ERINNNNNN!!'],
      ['L4TS:2018 (feat. あひる & KTA)', 'L4TS：2018 （feat. あひる ＆ KTA）'],
      ['Link (2)', 'Link（Circle of friends）'],
      ['Soul-ride ON!', 'Soul-ride ON！'],
      ['Sqlupp (Camellia\'s "Sqleipd*Hiytex" Remix)', 'Sqlupp （Camellia’s ”Sqleipd＊Hiytex” Remix）'],
      ['THE IDOLM@STER 2nd-mix', 'THE IDOLM＠STER 2nd-mix'],
      ['The world is all one !!', 'The world is all one ！！'],
      ['Trust', 'Trust（TANO*C）'],
      ['YA･DA･YO [Reborn]', 'YA・DA・YO [Reborn]'],
      ['galaxias!', 'galaxias！'],
      ['　', '\u200E'],
      ['ウッーウッーウマウマ(ﾟ∀ﾟ)', 'ウッーウッーウマウマ'],
      ['ガチャガチャきゅ～と・ふぃぎゅ@メイト', 'ガチャガチャきゅ～と・ふぃぎゅ＠メイト'],
      ['トルコ行進曲 - オワタ＼(^o^)／', 'トルコ行進曲 - オワタ'],
      ['大輪の魂 (feat. AO, 司芭扶)', '大輪の魂 （feat. AO， 司芭扶）'],
    ]);
    const autoMappings = new Set([
      'AMAZING MIGHTYYYY!!!!',
      'Alea jacta est!',
      'BREAK YOU!!',
      'BREaK! BREaK! BREaK!',
      'BaBan!! －甘い罠－',
      'Backyun! －悪い女－',
      'Bang Babang Bang!!!',
      'CALL HEAVEN!!',
      'CHOCOLATE BOMB!!!!',
      'Endless, Sleepless Night',
      'FREEDOM DiVE (tpz Overcute Remix)',
      'H-A-J-I-M-A-R-I-U-T-A-!!',
      'Help me, ERINNNNNN!!',
      'Help me, あーりん！',
      'I\'m with you',
      'JUMPIN\' JUMPIN\'',
      'Jump!! Jump!! Jump!!',
      'Jumping!!',
      'KING is BACK!!',
      'Let\'s Go Away',
      'Never Give Up!',
      'Now Loading!!!!',
      'Oshama Scramble!',
      'Scream out! -maimai SONIC WASHER Edit-',
      'Signs Of Love (“Never More” ver.)',
      'Splash Dance!!',
      'Time To Make History (AKIRA YAMAOKA Remix)',
      'TwisteD! XD',
      'WORLD\'S END UMBRELLA',
      'YATTA!',
      'air\'s gravity',
      'magician\'s operation',
      'shake it!',
      'specialist (“Never More” ver.)',
      'welcome to maimai!! with マイマイマー',
      'あ・え・い・う・え・お・あお!!',
      'おジャ魔女カーニバル!!',
      'ちがう!!!',
      'でらっくmaimai♪てんてこまい!',
      'オパ! オパ! RACER -GMT mashup-',
      'ドキドキDREAM!!!',
      'ナイト・オブ・ナイツ (Cranky Remix)',
      'ファンタジーゾーン OPA-OPA! -GMT remix-',
      'ラブリー☆えんじぇる!!',
      'リッジでリッジでGO!GO!GO! -GMT mashup-',
      '全力☆Summer!',
      '教えて!! 魔法のLyric',
      '最強 the サマータイム!!!!!',
      '泣き虫O\'clock',
      '無敵We are one!!',
      '電車で電車でGO!GO!GO!GC! -GMT remix-',
      '電車で電車でOPA!OPA!OPA! -GMT mashup-',
      '響け！CHIREI MY WAY!',
    ]);

    if (manualMappings.has(song.songId)) {
      return manualMappings.get(song.songId);
    }
    if (autoMappings.has(song.title)) {
      return song.title.replaceAll(/[!,'()]/g, '');
    }

    return song.title;
  })();

  return gamerchWikiV2TitleEscape(title);
}

function extractSheetExtras($: cheerio.CheerioAPI, table: cheerio.Element) {
  const noInternalLevel = ($(table).find('tr').eq(0).find('th').eq(1).text().trim() === '総数');

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

    if (noInternalLevel) {
      tdsData.splice(1, 0, '');
    }
    if (type === 'std') {
      tdsData.splice(6, 0, '');
    }

    const difficultyColor = tds[0].attribs.style.match('background-color:(#[0-9a-f]+)')![1];

    const [
      /* level */, /* internalLevel */,
      totalCount, tapCount, holdCount, slideCount, touchCount, breakCount,
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

        let result = $(nodes[anchorIndex + 1]).text().trim().replace(/^[…]|[、】]$/g, '').trim();

        //! hotfix
        result = result.replace('ロシェ＠', 'ロシェ@');
        result = result.replace('チャン＠', 'チャン@');
        result = result.replace('Revo＠', 'Revo@');

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
  }).filter((e) => e.difficulty !== null);
}

async function fetchSongPageUrlMap(songListUrl: string) {
  const response = await axios.get(songListUrl);
  const $ = cheerio.load(response.data);

  return new Map(
    $('.markup.mu > ul > li > a').toArray()
      .map((e) => [$(e).attr('title'), $(e).attr('href')]),
  );
}

async function fetchExtra(song: Record<string, any>, pageUrl: string) {
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
    $('h3:contains("譜面データ") + .mu__table > table').get(0),
    $('h4:contains("スタンダード譜面") + .mu__table > table').get(0),
    $('h4:contains("でらっくす譜面") + .mu__table > table').get(0),
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
  logger.info('Fetching song page url list ...');
  const songPageUrlMap = await fetchSongPageUrlMap(SONG_LIST_URL);
  logger.info(`OK, ${songPageUrlMap.size} song page url fetched.`);

  const songsToFetch: Record<string, any>[] = await sequelize.query(/* sql */ `
    SELECT "songId", "category", "title"
    FROM (
      SELECT DISTINCT "songId"
      FROM "Songs" LEFT JOIN "SongExtras" USING ("songId")
      WHERE (FALSE
        OR "SongExtras"."bpm" IS NULL
        OR "SongExtras"."releaseDate" IS NULL
      ) AND "category" <> '宴会場'
        UNION
      SELECT DISTINCT "songId"
      FROM "Sheets" LEFT JOIN "SheetExtras" USING ("songId", "type", "difficulty")
      WHERE (FALSE
        OR "noteCounts.tap" IS NULL
        OR "noteCounts.hold" IS NULL
        OR "noteCounts.slide" IS NULL
        OR ("noteCounts.touch" IS NULL AND "type" = 'dx')
        OR "noteCounts.break" IS NULL
        OR "noteCounts.total" IS NULL
        OR (0
          + "noteCounts.tap"
          + "noteCounts.hold"
          + "noteCounts.slide"
          + COALESCE("noteCounts.touch", 0)
          + "noteCounts.break"
        ) <> "noteCounts.total"
        OR ("noteDesigner" IS NULL)
      ) AND "type" <> 'utage'
    ) NATURAL LEFT JOIN "Songs"
  `, {
    type: Sequelize.QueryTypes.SELECT,
  });
  logger.info(`Found ${songsToFetch.length} page(s) to fetch.`);

  for (const [index, song] of songsToFetch.entries()) {
    try {
      logger.info(`(${1 + index} / ${songsToFetch.length}) Fetching & Updating extra: ${song.title} ...`);
      const pageUrl = songPageUrlMap.get(getSongWikiTitle(song));

      if (pageUrl === undefined) throw new Error(`Song page url not found on ${SONG_LIST_URL}`);

      const { songExtra, sheetExtras } = await fetchExtra(song, pageUrl);

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

/* eslint-disable no-await-in-loop */
/* eslint-disable newline-per-chained-call */
import axios from 'axios';
import Sequelize from 'sequelize';
import sleep from 'sleep-promise';
import log4js from 'log4js';
import * as cheerio from 'cheerio';
import { gamerchWikiV2TitleEscape } from '@/_core/utils';
import { sequelize, SheetExtra } from '@@/db/chunithm/models';

const logger = log4js.getLogger('chunithm/fetch-sheet-extras-v1');
logger.level = log4js.levels.INFO;

const SONG_LIST_URL = 'https://gamerch.com/chunithm/entry/748109';

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

export function getSongWikiTitle(song: Record<string, any>) {
  const title = (() => {
    //! hotfix
    const manualMappings = new Map([
      ['#SUP3RORBITAL', '♯SUP3RORBITAL'],
      ['Be A Shooter！～NORMAL BIG BONUS～', 'Be A Shooter！ ～NORMAL BIG BONUS～'],
      ['C & B', 'C ＆ B'],
      ['Cinderella Story [BlackY Remix]', 'Cinderella Story［BlackY Remix］'],
      ['DETARAME ROCK&ROLL THEORY', 'DETARAME ROCK＆ROLL THEORY'],
      ['GO! GO! MANIAC', 'GO!GO!MANIAC'],
      ['Get the star for you [DJ Command Remix]', 'Get the star for you［DJ Command Remix］'],
      ['Good bye, Merry-Go-Round.', 'Good bye，Merry-Go-Round.'],
      ['Help me, あーりん！', 'Help me，あーりん！'],
      ['Like the Wind [Reborn]', 'Like the Wind［Reborn］'],
      ['Mass Destruction ("P3" + "P3F" ver.)', 'Mass Destruction （”P3” ＋ ”P3F” ver.）'],
      ['Reach For The Stars', 'Reach for the Stars'],
      ['The wheel to the Night ～インド人が夢に!?～', 'The wheel to the Night ～インド人が夢に！？～'],
      ['What color...', 'What color…'],
      [']-[|/34<#!', 'ヒバチ'],
      ['おいでよ！ 高須らいむランド', 'おいでよ！高須らいむランド'],
      ['ってゐ！　～えいえんてゐVer～', 'ってゐ！ ～えいえんてゐVer～'],
      ['エンドマークに希望と涙を添えて ～イロドリミドリアレンジ～', 'エンドマークに希望と涙を添えて～イロドリミドリアレンジ～'],
      ['トリスメギストス', 'トリスメギストス（楽曲名）'],
      ['トリドリ⇒モリモリ! Lovely fruits☆', 'トリドリ⇒モリモリ！Lovely fruits☆'],
      ['ナイト・オブ・ナイツ (かめりあ’s“ワンス・アポン・ア・ナイト”Remix)', 'ナイト・オブ・ナイツ （かめりあ’s”ワンス・アポン・ア・ナイト”Remix）'],
      ['光線チューニング ～なずな妄想海フェスイメージトレーニングVer.～', '光線チューニング～なずな妄想海フェスイメージトレーニングVer.～'],
      ['少女幻葬戦慄曲　～　Necro Fantasia', '少女幻葬戦慄曲 ～ Necro Fantasia'],
      ['患部で止まってすぐ溶ける～狂気の優曇華院', '患部で止まってすぐ溶ける ～狂気の優曇華院'],
      ['紅', '紅（楽曲名）'],
    ]);
    const autoMappings = new Set([
      'Bad Apple!! feat.nomico (Nhato Remix)',
      'Bad Apple!! feat.nomico (REDALiCE Remix)',
      'Dig Delight!',
      'Girl\'s Party Planet!',
      'Let you DIVE!',
      'NewStartでReadyGo!',
      'Oshama Scramble! (Cranky Remix)',
      'Perfect Shining!!',
      'P！P！P！P！がおー!!',
      'Say!ファンファーレ!',
      'Shout Our Evidence!',
      'THE BRASS OF GOODSPEED!!',
      'Van!shment Th!s World',
      'WE\'RE BACK!!',
      'Yes! Party Time!!',
      'みんな Happy!!',
      'アイリちゃんは暗黒魔導士!',
      '今宵mofumofu!!',
      '大天使ユリア★降臨!',
      '最強 the サマータイム!!!!!',
    ]);

    if (manualMappings.has(song.songId)) {
      return manualMappings.get(song.songId);
    }
    if (autoMappings.has(song.title)) {
      return song.title.replaceAll('!', '！');
    }

    return song.title;
  })();

  return gamerchWikiV2TitleEscape(title);
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

  const sheetExtras = [
    $('div:contains("詳細") + .mu__table > table').get(0),
    $('div:contains("詳細") + p + .mu__table > table').get(0),
    $('div:contains("詳細") + br + .mu__table > table').get(0),
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
  logger.info('Fetching song page url list ...');
  const songPageUrlMap = await fetchSongPageUrlMap(SONG_LIST_URL);
  logger.info(`OK, ${songPageUrlMap.size} song page url fetched.`);

  const songsToFetch: Record<string, any>[] = await sequelize.query(/* sql */ `
    SELECT "songId", "category", "title"
    FROM (
      SELECT DISTINCT "songId"
      FROM "Sheets"
        LEFT JOIN "SheetExtras" USING ("songId", "type", "difficulty")
        LEFT JOIN "SongExtras" USING ("songId")
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
        OR "noteDesigner" IS NULL
      ) AND (
        "type" <> 'we'
      ) AND (
        "releaseDate" < '2022-12-22'
      )
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

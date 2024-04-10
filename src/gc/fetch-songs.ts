/* eslint-disable no-await-in-loop */
import axios from 'axios';
import log4js from 'log4js';
import sleep from 'sleep-promise';
import * as cheerio from 'cheerio';
import { hashed, ensureNoDuplicateEntry } from '@/_core/utils';
import { Song, Sheet, SongExtra } from '@@/db/gc/models';

const logger = log4js.getLogger('gc/fetch-songs');
logger.level = log4js.levels.INFO;

const DATA_URL = 'https://groovecoaster.jp/music/';

function getSongId(rawSong: Record<string, any>) {
  return rawSong.title;
}

function extractCategories($: cheerio.CheerioAPI) {
  const categories = $('.music-nav nav ul li').toArray()
    .map((li) => ({
      category: $(li).find('a').text().trim(),
      selector: $(li).find('a').attr('href')!,
    }));

  return categories;
}

function extractSongs($: cheerio.CheerioAPI, category: string, selector: string) {
  const songs = $(`${selector} ul li > a`).toArray()
    .map((a) => {
      // const [, id] = $(a).attr('href')!.match(/^\/music\/(.+)\.html$/)!;

      const infoTexts = $(a).find('.music').contents()
        .toArray()
        .map((e) => $(e).text().trim());

      //! hotfix
      if ([
        '電車で電車でOPA!OPA!OPA! -GMT mashup-／mashup by Yuji Masubuchi(BNSI)',
        'Soul Evolution／上高治己(Jimmy Weckl) vocal by 織田かおり／「ガンスリンガー ストラトス2」第十七極東帝都管理区・NEO SHIBUYAステージBGM',
        '瞳のLAZhWARD ／山崎良 vocal by メイリア(GARNiDELiA)／「ガンスリンガー ストラトス2」フロンティアS・旧渋谷荒廃地区ステージBGM',
      ].includes(infoTexts[0])) {
        const [realTitle, realArtist] = infoTexts[0].split('／', 2).map((s) => s.trim());
        infoTexts.splice(0, 2, realTitle, '', realArtist, '');
      }
      if (infoTexts[0] === 'Shooting Star') {
        infoTexts.splice(2, 4, 'Masashi Hamauzu / Mina', '');
      }
      if (infoTexts[0] === 'Invader Disco') infoTexts[4] = '2013.11.5';
      if (infoTexts[0] === 'Crystal tears') infoTexts[4] = '2013.12.18';
      if (infoTexts[0] === 'Extreme MGG★★★') infoTexts[4] = '2013.12.26';
      if (infoTexts[0] === 'Captain NEO -Confusion Mix-') infoTexts[4] = '2014.1.10';
      if (infoTexts[0] === 'I, SCREAM') infoTexts[4] = '2014.8.27';

      const title = infoTexts[0];
      const artist = infoTexts[2];

      const imageUrl = encodeURI($(a).find('.photo img').attr('src')!);
      const imageName = `${hashed(imageUrl)}.png`;

      const release = infoTexts[4]?.match(/^(\d+)\.(\d+)\.(\d+)$/);
      const releaseDate = release ? `${
        release[1].padStart(4, '0')
      }-${
        release[2].padStart(2, '0')
      }-${
        release[3].padStart(2, '0')
      }` : null;

      const detailUrl = new URL($(a).attr('href')!, DATA_URL).toString();

      const rawSong = {
        category,
        title,
        artist,

        imageName,
        imageUrl,

        version: null,
        releaseDate,

        isNew: $(a).find('.new img').length > 0,
        isLocked: null,

        comment: null,

        hasEx: $(a).find('img.icon_extra').length > 0,
        detailUrl,
      };

      return {
        songId: getSongId(rawSong),
        ...rawSong,
      };
    });

  return songs;
}

async function fetchSongExtra(song: Record<string, any>) {
  const response = await axios.get(song.detailUrl);
  const $ = cheerio.load(response.data);

  const bpm = Number.parseFloat($('.param-block .details ul .bpm').text().trim()) || null;

  const levels = $('.param-block .difficulty ul li').toArray()
    .map((ul) => $(ul).find('img').attr('src')!.match(/^\/img\/music\/img_dif_(\d+).png$/)![1]);

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
  logger.info(`Fetching data from: ${DATA_URL} ...`);
  const response = await axios.get(DATA_URL);
  const $ = cheerio.load(response.data);

  logger.info('Extracting categories info ...');
  const categoryMappings = extractCategories($);
  logger.info(`OK, ${categoryMappings.length} categories found.`);

  const songs: Record<string, any>[] = [];

  for (const { category, selector } of categoryMappings) {
    logger.info(`* category '${category}'`);

    songs.push(...extractSongs($, category, selector));
  }
  logger.info(`OK, ${songs.length} songs fetched.`);

  songs.reverse();

  logger.info('Ensuring every song has an unique songId ...');
  ensureNoDuplicateEntry(songs.map((song) => getSongId(song)));

  logger.info('Updating songs ...');
  await Promise.all(songs.map((song) => Song.upsert(song)));

  const existedSheets = await Sheet.findAll<any>();
  const existedExSheets = await Sheet.findAll<any>({ where: { difficulty: 'extra' } });
  const existedSongExtras = await SongExtra.findAll<any>();

  const songsToFetch = songs.filter(
    (song) => (
      !existedSheets.some((sheet) => sheet.songId === song.songId)
      || (song.hasEx && !existedExSheets.some((sheet) => sheet.songId === song.songId))
      || !existedSongExtras.some((songExtra) => songExtra.songId === song.songId)
    ),
  );
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

/* eslint-disable no-await-in-loop */
import axios from 'axios';
import sleep from 'sleep-promise';
import log4js from 'log4js';
import * as cheerio from 'cheerio';
import { Song, Sheet } from '@@/db/taiko/models';

const logger = log4js.getLogger('taiko/fetch-songs');
logger.level = log4js.levels.INFO;

const DATA_URL = 'https://taiko.namco-ch.net/taiko/songlist/';

function getSongId(rawSong: Record<string, any>) {
  const { title, artist } = rawSong;
  if (title === 'エンジェル ドリーム') {
    if (artist === '「アイドルマスター シンデレラガールズ」より') return 'エンジェル ドリーム';
    if (artist === null) return 'エンジェル ドリーム (2)';
    if (artist === 'フレン・E・ルスタリオ / FOCUS ON (にじさんじ) × 太鼓の達人') return 'エンジェル ドリーム (3)';
  }
  if (title === 'ファミレスウォーズ') {
    if (artist === null) return 'ファミレスウォーズ';
    if (artist === '本間ひまわり / FOCUS ON (にじさんじ) × 太鼓の達人') return 'ファミレスウォーズ (2)';
  }
  if (title === 'Fly away') {
    if (artist === null) return 'Fly away';
    if (artist === '伏見ガク / FOCUS ON (にじさんじ) × 太鼓の達人') return 'Fly away (2)';
  }
  if (title === '濃紅') {
    if (artist === '黒沢ダイスケ × 小寺可南子') return '濃紅';
    if (artist === 'レヴィ・エリファ / FOCUS ON (にじさんじ) × 太鼓の達人') return '濃紅 (2)';
  }
  if (title === 'CYBERgenicALICE') {
    if (artist === null) return 'CYBERgenicALICE';
    if (artist === '先斗寧 / FOCUS ON (にじさんじ) × 太鼓の達人') return 'CYBERgenicALICE (2)';
  }
  if (title === 'マリオネットピュア') {
    if (artist === null) return 'マリオネットピュア';
    if (artist === 'リゼ・ヘルエスタ / FOCUS ON (にじさんじ) × 太鼓の達人') return 'マリオネットピュア (2)';
  }
  if (title === 'Phoenix') {
    if (artist === null) return 'Phoenix';
    if (artist === 'レオス・ヴィンセント / FOCUS ON (にじさんじ) × 太鼓の達人') return 'Phoenix (2)';
  }
  if (title === 'ヘイラ') {
    if (artist === 'necchi') return 'ヘイラ';
    if (artist === 'ましろ爻 / FOCUS ON (にじさんじ) × 太鼓の達人') return 'ヘイラ (2)';
  }
  if (title === 'いっそこのままで') {
    if (artist === 'ミフメイ(BNSI) feat. 相沢') return 'いっそこのままで';
    if (artist === '山神カルタ / FOCUS ON (にじさんじ) × 太鼓の達人') return 'いっそこのままで (2)';
  }
  if (title === 'ボクハシンセ') {
    if (artist === null) return 'ボクハシンセ';
    if (artist === '花畑チャイカ / FOCUS ON (にじさんじ) × 太鼓の達人') return 'ボクハシンセ (2)';
  }
  return title;
}

async function fetchCategories() {
  const response = await axios.get(DATA_URL);
  const $ = cheerio.load(response.data);

  const categories = $('#sgnavi ul li').toArray()
    .map((li) => ({
      category: $(li).find('img').attr('alt'),
      pageUrl: new URL($(li).find('a').attr('href')!, DATA_URL).toString(),
    }));

  return categories;
}

async function getSongs(pageUrl: string) {
  const response = await axios.get(pageUrl);
  const $ = cheerio.load(response.data);

  const section = $('#mainCol > section');

  const category = section.find('.tit').text().trim();
  const songs = section.find('tbody tr').toArray()
    .map((tr) => {
      const $th = $(tr).find('th');
      const thChildren = $th.contents().toArray();
      const tds = $(tr).find('td').toArray();

      const title = $(thChildren[0]).text().trim();
      const artist = $(thChildren.slice(-2)[0]).text().trim() || null;

      const parseLevel = (text: string) => {
        const levelValue = Number.parseInt(text, 10);
        return !Number.isNaN(levelValue) ? `★${levelValue}` : null;
      };

      const rawSong = {
        category,
        title,
        artist,

        imageName: 'default-cover.png',
        imageUrl: null,

        level_easy: parseLevel($(tds[1]).text().trim()),
        level_normal: parseLevel($(tds[2]).text().trim()),
        level_hard: parseLevel($(tds[3]).text().trim()),
        level_oni: parseLevel($(tds[4]).text().trim()),
        level_ura_oni: parseLevel($(tds[5]).text().trim()),

        version: null,
        releaseDate: null,

        isNew: $th.find('.new').length !== 0,
        isLocked: $th.find('.icoMedal, .icoAi, .icoCampaign, .icoCode, .icoSecrect').length !== 0,

        comment: null,
      };

      return {
        songId: getSongId(rawSong),
        ...rawSong,
      };
    });

  return songs;
}

function mergeSongs(songs: Record<string, any>[]) {
  const mergedSongs = new Map<string, Record<string, any>>();

  for (const song of songs) {
    if (mergedSongs.has(song.songId)) {
      const mergedSong = mergedSongs.get(song.songId)!;

      if (song.artist !== mergedSong.artist) {
        throw new Error(`Same songId with different artist detected: ${song.songId}`);
      }

      mergedSong.category += `|${song.category}`;
    } else {
      mergedSongs.set(song.songId, song);
    }
  }

  return Array.from(mergedSongs.values());
}

function extractSheets(song: Record<string, any>) {
  return [
    { type: 'std', difficulty: 'easy', level: song.level_easy },
    { type: 'std', difficulty: 'normal', level: song.level_normal },
    { type: 'std', difficulty: 'hard', level: song.level_hard },
    { type: 'std', difficulty: 'oni', level: song.level_oni },
    { type: 'ura', difficulty: 'ura_oni', level: song.level_ura_oni },
  ].filter((e) => !!e.level).map((rawSheet) => ({
    songId: song.songId,
    ...rawSheet,
  }));
}

export default async function run() {
  logger.info('Fetching categories info ...');
  const categoryMappings = await fetchCategories();
  logger.info(`OK, ${categoryMappings.length} categories found.`);

  let songs: Record<string, any>[] = [];

  logger.info(`Fetching data from: ${DATA_URL} ...`);
  for (const { category, pageUrl } of categoryMappings) {
    logger.info(`* category '${category}'`);

    songs.push(...await getSongs(pageUrl));

    await sleep(500);
  }
  logger.info(`OK, ${songs.length} songs fetched.`);

  logger.info('Merging duplicate songs in different categories ...');
  songs = mergeSongs(songs);
  logger.info(`OK, merged into ${songs.length} songs.`);

  songs.reverse();

  const sheets = songs.flatMap((song) => extractSheets(song));

  logger.info('Updating songs ...');
  await Promise.all(songs.map((song) => Song.upsert(song)));

  logger.info('Updating sheets ...');
  await Promise.all(sheets.map((sheet) => Sheet.upsert(sheet)));

  logger.info('Done!');
}

if (require.main === module) run();

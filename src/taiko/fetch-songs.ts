/* eslint-disable no-await-in-loop */
import axios from 'axios';
import log4js from 'log4js';
import sleep from 'sleep-promise';
import * as cheerio from 'cheerio';
import { Song, Sheet } from './models';
import { checkDuplicatedTitle } from '../core/utils';

const logger = log4js.getLogger('taiko/fetch-songs');
logger.level = log4js.levels.INFO;

const DATA_URL = 'https://taiko.namco-ch.net/taiko/songlist/';

async function fetchCategories() {
  const response = await axios.get(DATA_URL);
  const $ = cheerio.load(response.data);

  const categories = $('#sgnavi ul li').toArray().map((li) => ({
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
  const songs = section.find('tbody tr').toArray().map((tr) => {
    const $th = $(tr).find('th');
    const thChildren = $th.contents().toArray();
    const tds = $(tr).find('td').toArray();

    const title = $(thChildren[0]).text().trim();
    const artist = $(thChildren.slice(-2)[0]).text().trim() || null;

    return {
      category,
      title,

      artist,

      imageName: 'default-cover.png',
      imageUrl: null,

      level_easy: Number.parseInt($(tds[1]).text().trim(), 10),
      level_normal: Number.parseInt($(tds[2]).text().trim(), 10),
      level_hard: Number.parseInt($(tds[3]).text().trim(), 10),
      level_oni: Number.parseInt($(tds[4]).text().trim(), 10),
      level_ura_oni: Number.parseInt($(tds[5]).text().trim(), 10),

      version: null,
      releaseDate: null,

      isNew: $th.find('.new').length !== 0,
      isLocked: $th.find('.secrect').length !== 0,
    };
  });

  return songs;
}

function extractSheets(song: Record<string, any>) {
  return [
    { type: 'std', difficulty: 'easy', level: song.level_easy },
    { type: 'std', difficulty: 'normal', level: song.level_normal },
    { type: 'std', difficulty: 'hard', level: song.level_hard },
    { type: 'std', difficulty: 'oni', level: song.level_oni },
    { type: 'ura', difficulty: 'ura_oni', level: song.level_ura_oni },
  ].filter((e) => !!e.level).map((rawSheet) => ({
    category: song.category,
    title: song.title,
    ...rawSheet,
  }));
}

export default async function run() {
  logger.info('Fetching categories info ...');
  const categoryMappings = await fetchCategories();
  logger.info(`OK, ${categoryMappings.length} categories found.`);

  const songs: Record<string, any>[] = [];

  logger.info(`Fetching data from: ${DATA_URL} ...`);
  for (const { category, pageUrl } of categoryMappings) {
    logger.info(`* category '${category}'`);

    songs.push(...await getSongs(pageUrl));

    await sleep(500);
  }
  logger.info(`OK, ${songs.length} songs fetched.`);

  songs.reverse();

  const sheets = songs.flatMap((song) => extractSheets(song));
  checkDuplicatedTitle(songs, logger);

  logger.info('Preparing Songs table ...');
  await Song.sync();

  logger.info('Preparing Sheets table ...');
  await Sheet.sync();

  logger.info('Updating songs ...');
  await Promise.all(songs.map((song) => Song.upsert(song)));

  logger.info('Updating sheets ...');
  await Promise.all(sheets.map((sheet) => Sheet.upsert(sheet)));

  logger.info('Done!');
}

if (require.main === module) run();

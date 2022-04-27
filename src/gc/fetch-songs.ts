/* eslint-disable no-await-in-loop */
import axios from 'axios';
import log4js from 'log4js';
import * as cheerio from 'cheerio';
import { Song } from './models';
import { hashed } from '../core/utils';

const logger = log4js.getLogger('gc/fetch-songs');
logger.level = log4js.levels.INFO;

const DATA_URL = 'https://groovecoaster.jp/music/';

function extractCategories($: cheerio.CheerioAPI) {
  const categories = $('.music-nav nav ul li').toArray().map((li) => ({
    category: $(li).find('a').text(),
    selector: $(li).find('a').attr('href')!,
  }));

  return categories;
}

function extractSongs($: cheerio.CheerioAPI, category: string, selector: string) {
  const songs = $(`${selector} ul li > a`).toArray().map((a) => {
    const [, songId] = $(a).attr('href')!.match(/^\/music\/(.+)\.html$/)!;

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

    return {
      songId,

      category,
      title,

      artist,

      imageName,
      imageUrl,

      version: null,
      releaseDate,

      isNew: $(a).find('.new img').length > 0,
    };
  });

  return songs;
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

  logger.info('Preparing Songs table ...');
  await Song.sync();

  logger.info('Updating songs ...');
  await Promise.all(songs.map((song) => Song.upsert(song)));

  logger.info('Done!');
}

if (require.main === module) run();

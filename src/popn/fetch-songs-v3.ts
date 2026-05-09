/* eslint-disable no-await-in-loop */
import axios from 'axios';
import sleep from 'sleep-promise';
import log4js from 'log4js';
import * as cheerio from 'cheerio';
import { Song, Sheet, JpSheet } from '@@/db/popn/models';
import { chunkBy, concatOrCoalesceString, ensureNoDuplicateEntry, hashed } from '@/_core/utils';
import { manualAltMappingWithGenre, manualAltMappingWithArtist } from './fetch-songs-v1';
import 'dotenv/config';

const logger = log4js.getLogger('popn/fetch-songs-v3');
logger.level = log4js.levels.INFO;

const VERSION_ID = 'popn29';

const DATA_URL = 'https://p.eagate.573.jp';
const IMAGE_BASE_URL = 'https://p.eagate.573.jp/';

const categoryMap = new Map([
  [1, 'オススメ'],
  [2, '東方アレンジ'],
  [3, 'ひなビタ♪'],
  [4, 'バンめし♪'],
  [5, 'TV・アニメ'],
  [6, 'J-POP'],
  [7, 'NET MUSIC・VOCALOID'],
  [8, 'クラシック'],
  [9, 'GAME MUSIC'],
  //! add further category here !//
]);

const bemaniCategoryMap = new Map([
  [1, 'beatmania IIDX'],
  [2, 'DanceDanceRevolution'],
  [3, 'GITADORA'],
  [4, 'jubeat'],
  [5, 'REFLEC BEAT'],
  [6, 'SOUND VOLTEX'],
  [7, 'BeatStream'],
  [8, 'MUSECA'],
  [9, 'ノスタルジア'],
  [10, 'BEMANI'],
  //! add further bemani category here !//
]);

const versionMap = new Map([
  [0, 'pop\'n 家庭用'],
  [1, 'pop\'n music'],
  [2, 'pop\'n music 2'],
  [3, 'pop\'n music 3'],
  [4, 'pop\'n music 4'],
  [5, 'pop\'n music 5'],
  [6, 'pop\'n music 6'],
  [7, 'pop\'n music 7'],
  [8, 'pop\'n music 8'],
  [9, 'pop\'n music 9'],
  [10, 'pop\'n music 10'],
  [11, 'pop\'n music 11'],
  [12, 'pop\'n music 12 いろは'],
  [13, 'pop\'n music 13 カーニバル'],
  [14, 'pop\'n music 14 FEVER！'],
  [15, 'pop\'n music 15 ADVENTURE'],
  [16, 'pop\'n music 16 PARTY♪'],
  [17, 'pop\'n music 17 THE MOVIE'],
  [18, 'pop\'n music 18 せんごく列伝'],
  [19, 'pop\'n music 19 TUNE STREET'],
  [20, 'pop\'n music 20 fantasia'],
  [21, 'pop\'n music Sunny Park'],
  [22, 'pop\'n music ラピストリア'],
  [23, 'pop\'n music éclale'],
  [24, 'pop\'n music うさぎと猫と少年の夢'],
  [25, 'pop\'n music peace'],
  [26, 'pop\'n music 解明リドルズ'],
  [27, 'pop\'n music UniLab'],
  [28, 'pop\'n music Jam&Fizz'],
  [29, 'pop\'n music High☆Cheers!!'],
  //! add further version here !//
]);

function getSheetType(rawSong: Record<string, any>) {
  const { title } = rawSong;

  return title.endsWith('(UPPER)') ? 'upper' : 'std';
}

function getSongId(rawSong: Record<string, any>) {
  const { title, genre, artist } = rawSong;

  if (title === 'Homesick Pt.2&3') {
    if (genre === 'ソフトロック' && artist === 'ORANGENOISE SHORTCUT') return 'Homesick Pt.2&3';
    if (genre === 'ソフトロックＬＯＮＧ' && artist === 'ORANGENOISE SHORTCUT') return 'Homesick Pt.2&3 (2)';
    if (genre === 'ソフトロックＬＯＮＧ' && artist === 'covered by 不知火フレア') return 'Homesick Pt.2&3 (3)';

    throw new Error(`Cannot resolve song: ${title}`);
  }

  if (manualAltMappingWithGenre.has(title)) {
    const genres = manualAltMappingWithGenre.get(title)!;
    const genrePos = genres.indexOf(genre);

    if (genrePos === 0) return title;
    if (genrePos >= 1) return `${title} (${1 + genrePos})`;

    throw new Error(`Cannot use manual mapping with genre: ${JSON.stringify(rawSong)}`);
  }

  if (manualAltMappingWithArtist.has(title)) {
    const artists = manualAltMappingWithArtist.get(title)!;
    const artistPos = artists.indexOf(artist);

    if (artistPos === 0) return title;
    if (artistPos >= 1) return `${title} (${1 + artistPos})`;

    throw new Error(`Cannot use manual mapping with artist: ${JSON.stringify(rawSong)}`);
  }

  return title;
}

export function mergeSongs(songs: Record<string, any>[]) {
  const mergedSongs = new Map<string, Record<string, any>>();

  for (const song of songs) {
    if (mergedSongs.has(song.id)) {
      const mergedSong = mergedSongs.get(song.id)!;

      mergedSong.category = concatOrCoalesceString(mergedSong.category, song.category);
      mergedSong.version ??= song.version;
    } else {
      mergedSongs.set(song.id, song);
    }
  }

  const mergedSongsList = [...mergedSongs.values()]
    .toSorted((a, b) => Number(a.version != null) - Number(b.version != null));

  for (const song of mergedSongsList) {
    song.sheetType = getSheetType(song);
    song.songId = getSongId(song);
  }

  return mergedSongsList;
}

async function* fetchSongs({
  versionId = /* ALL */ -1,
  categoryId = /* ALL */ 0,
  bemaniId = /* ALL */ 0,
}: {
  versionId?: number,
  categoryId?: number,
  bemaniId?: number,
}) {
  async function* startFetchPage(pageNo = 0): AsyncGenerator<Record<string, any>[]> {
    logger.info(`- page ${pageNo}`);

    const response = await axios.get(`${DATA_URL}/game/popn/${VERSION_ID}/music/list.html`, {
      params: {
        version: versionId,
        category: categoryId,
        bemani: bemaniId,
        page: pageNo,
      },
    });

    const $ = cheerio.load(response.data);

    const songs = chunkBy($('.mu_list_table:not(.mu_head) > li').toArray(), 3)
      .map(([imageLi, infoLi, levelsLi]) => {
        const imageUrl = new URL($(imageLi).find('img').attr('src')!, IMAGE_BASE_URL).toString();
        const imageName = `${hashed(imageUrl)}.png`;

        const id = new URL(imageUrl).searchParams.get('img');
        const genre = $(infoLi).find('p:nth-of-type(1)').text().trim();
        const title = $(infoLi).find('p:nth-of-type(2)').text().trim();
        const artist = $(infoLi).find('p:nth-of-type(3)').text().trim();

        const levels = $(levelsLi).find('p').toArray()
          .map((e) => $(e).data('d'))
          .map((e) => (e !== '-' ? e : null));

        const rawSong = {
          id,
          genre,

          category: categoryMap.get(categoryId) ?? bemaniCategoryMap.get(bemaniId) ?? null,
          title,
          artist,

          imageName,
          imageUrl,

          lev_light: levels[0],
          lev_normal: levels[1],
          lev_hyper: levels[2],
          lev_ex: levels[3],

          version: versionMap.get(versionId) ?? null,
          releaseDate: null,

          isNew: null,
          isLocked: null,

          comment: null,
        };

        return {
          // songId will be assigned during merge
          ...rawSong,
        };
      });

    yield songs;

    if ($('a:contains(次へ>>)').length > 0) {
      await sleep(500);
      yield* startFetchPage(pageNo + 1);
    }
  }

  yield* startFetchPage();
}

function extractSheets(rawSong: Record<string, any>) {
  return [
    { difficulty: 'light', level: rawSong.lev_light },
    { difficulty: 'normal', level: rawSong.lev_normal },
    { difficulty: 'hyper', level: rawSong.lev_hyper },
    { difficulty: 'ex', level: rawSong.lev_ex },
  ].filter((e) => e.level != null).map((rawSheet) => ({
    songId: rawSong.songId,
    type: rawSong.sheetType,
    ...rawSheet,
  }));
}

export default async function run() {
  logger.info(`Fetching songs from: ${DATA_URL} ...`);
  const rawSongs: Record<string, any>[] = [];
  for (const [versionId, version] of versionMap.entries()) {
    logger.info(`* version '${version}' (${versionId})`);

    for await (const pageOfSongs of fetchSongs({ versionId })) {
      rawSongs.push(...pageOfSongs);
    }
  }
  for (const [categoryId, category] of categoryMap.entries()) {
    logger.info(`* category '${category}' (${categoryId})`);

    for await (const pageOfSongs of fetchSongs({ categoryId })) {
      rawSongs.push(...pageOfSongs);
    }
  }
  for (const [bemaniId, bemani] of bemaniCategoryMap.entries()) {
    logger.info(`* bemani '${bemani}' (${bemaniId})`);

    for await (const pageOfSongs of fetchSongs({ bemaniId })) {
      rawSongs.push(...pageOfSongs);
    }
  }

  logger.info('Merging duplicate songs in different versions ...');
  const songs = mergeSongs(rawSongs);
  logger.info(`OK, ${rawSongs.length} raw songs merged into ${songs.length} songs.`);

  logger.info('Ensuring every song has an unique songId ...');
  ensureNoDuplicateEntry(songs.map((song) => song.songId));

  const sheets = songs.flatMap((rawSong) => extractSheets(rawSong));

  logger.info('Updating songs ...');
  await Promise.all(songs.map((song) => Song.upsert(song)));

  logger.info('Updating sheets ...');
  await Promise.all(sheets.map((sheet) => Sheet.upsert(sheet)));

  logger.info('Truncating and Inserting jpSheets ...');
  await JpSheet.truncate();
  await JpSheet.bulkCreate(sheets);

  logger.info('Done!');
}

if (require.main === module) run();

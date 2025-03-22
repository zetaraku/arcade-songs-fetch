import axios from 'axios';
import log4js from 'log4js';
import { CnSheet } from '@@/db/maimai/models';

const logger = log4js.getLogger('maimai/fetch-cn-sheets');
logger.level = log4js.levels.INFO;

const DATA_URL = 'https://raw.githubusercontent.com/CrazyKidCN/maimaiDX-CN-songs-database/main/maidata.json';

const categoryMap = new Map([
  ['流行&动漫', 'POPS＆アニメ'],
  ['niconico＆VOCALOID™', 'niconico＆ボーカロイド'],
  ['东方Project', '東方Project'],
  ['其他游戏', 'ゲーム＆バラエティ'],
  ['舞萌', 'maimai'],
  ['音击/中二节奏', 'オンゲキ＆CHUNITHM'],
  //! add further category here !//
]);

function getSongId(title: string, category: string) {
  if (title === 'Link') {
    if (category === 'maimai') return 'Link';
    if (category === 'niconico＆ボーカロイド') return 'Link (2)';
  }
  if (title === 'Help me, ERINNNNNN!!') {
    return 'Help me, ERINNNNNN!!（Band ver.）';
  }
  if (title === 'Bad Apple!! feat nomico') {
    return 'Bad Apple!! feat.nomico';
  }
  return title;
}

function extractCnSheets(rawCnSong: Record<string, any>) {
  return [
    { type: 'dx', difficulty: 'basic', level: rawCnSong.dx_lev_bas },
    { type: 'dx', difficulty: 'advanced', level: rawCnSong.dx_lev_adv },
    { type: 'dx', difficulty: 'expert', level: rawCnSong.dx_lev_exp },
    { type: 'dx', difficulty: 'master', level: rawCnSong.dx_lev_mas },
    { type: 'dx', difficulty: 'remaster', level: rawCnSong.dx_lev_remas },
    { type: 'std', difficulty: 'basic', level: rawCnSong.lev_bas },
    { type: 'std', difficulty: 'advanced', level: rawCnSong.lev_adv },
    { type: 'std', difficulty: 'expert', level: rawCnSong.lev_exp },
    { type: 'std', difficulty: 'master', level: rawCnSong.lev_mas },
    { type: 'std', difficulty: 'remaster', level: rawCnSong.lev_remas },
  ].filter((e) => !!e.level).map((rawCnSheet) => {
    let { category, title } = rawCnSong;

    // map CN category to JP category
    category = categoryMap.get(category) ?? null;

    if (category === null) {
      logger.warn(`Unknown category: ${rawCnSong.category}`);
    }

    //! hotfix
    if (title === 'D✪N’T ST✪P R✪CKIN’') {
      title = 'D✪N’T  ST✪P  R✪CKIN’';
    }

    return {
      songId: getSongId(title, category),
      ...rawCnSheet,
    };
  });
}

export default async function run() {
  logger.info(`Fetching data from: ${DATA_URL} ...`);
  const response = await axios.get(DATA_URL);

  const rawCnSongs: Record<string, any>[] = response.data;
  logger.info(`OK, ${rawCnSongs.length} songs fetched.`);

  logger.info('Truncating and Inserting cnSheets ...');
  const cnSheets = rawCnSongs.flatMap((rawCnSong) => extractCnSheets(rawCnSong));
  await CnSheet.truncate();
  await CnSheet.bulkCreate(cnSheets);

  logger.info('Done!');
}

if (require.main === module) run();

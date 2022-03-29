import axios from 'axios';
import log4js from 'log4js';
import { CnSheet } from './models';

const logger = log4js.getLogger('maimai/fetch-cn-sheets');
logger.level = log4js.levels.INFO;

const DATA_URL = 'https://raw.githubusercontent.com/CrazyKidCN/maimaiDX-CN-songs-database/main/maidata.json';

const categoryMap = new Map([
  ['流行&动漫', 'POPS＆アニメ'],
  ['niconico＆VOCALOID', 'niconico＆ボーカロイド'],
  ['东方Project', '東方Project'],
  ['其他游戏', 'ゲーム＆バラエティ'],
  ['舞萌', 'maimai'],
  ['音击/中二节奏', 'オンゲキ＆CHUNITHM'],
  //! add further category here !//
]);

function extractCnSheets(rawSong: Record<string, any>) {
  return [
    { type: 'dx', difficulty: 'basic', level: rawSong.dx_lev_bas },
    { type: 'dx', difficulty: 'advanced', level: rawSong.dx_lev_adv },
    { type: 'dx', difficulty: 'expert', level: rawSong.dx_lev_exp },
    { type: 'dx', difficulty: 'master', level: rawSong.dx_lev_mas },
    { type: 'dx', difficulty: 'remaster', level: rawSong.dx_lev_remas },
    { type: 'std', difficulty: 'basic', level: rawSong.lev_bas },
    { type: 'std', difficulty: 'advanced', level: rawSong.lev_adv },
    { type: 'std', difficulty: 'expert', level: rawSong.lev_exp },
    { type: 'std', difficulty: 'master', level: rawSong.lev_mas },
    { type: 'std', difficulty: 'remaster', level: rawSong.lev_remas },
  ].filter((e) => !!e.level).map((rawSheet) => {
    let { category, title } = rawSong;

    // map CN category to JP category
    category = categoryMap.get(category) ?? null;

    //! hotfix
    if (title === 'D✪N’T ST✪P R✪CKIN’') {
      title = 'D✪N’T  ST✪P  R✪CKIN’';
    }

    return {
      category,
      title,
      ...rawSheet,
    };
  });
}

export default async function run() {
  logger.info(`Fetching data from: ${DATA_URL} ...`);
  const response = await axios.get(DATA_URL);

  const rawSongs: Record<string, any>[] = response.data;
  logger.info(`OK, ${rawSongs.length} songs fetched.`);

  logger.info('Recreating CnSheets table ...');
  await CnSheet.sync({ force: true });

  logger.info('Inserting sheets ...');
  const sheets = rawSongs.flatMap((rawSong) => extractCnSheets(rawSong));
  CnSheet.bulkCreate(sheets);

  logger.info('Done!');
}

if (require.main === module) run();

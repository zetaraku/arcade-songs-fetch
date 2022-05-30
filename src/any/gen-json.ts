/* eslint-disable no-await-in-loop */
import fs from 'fs';
import log4js from 'log4js';

const logger = log4js.getLogger('any/gen-json');
logger.level = log4js.levels.INFO;

const DIST_PATH = 'dist/any';

const difficultyMappingList = [
  { difficulty: 'maimai', name: 'maimai', color: '#1976d2' },
  { difficulty: 'wacca', name: 'WACCA', color: '#e50065' },
  { difficulty: 'chunithm', name: 'CHUNITHM', color: '#f3a607' },
  { difficulty: 'sdvx', name: 'SOUND VOLTEX', color: '#404040' },
  { difficulty: 'jubeat', name: 'jubeat', color: '#134c43' },
  { difficulty: 'taiko', name: '太鼓の達人', color: '#f50000' },
  { difficulty: 'ongeki', name: 'オンゲキ', color: '#32b9cc' },
  { difficulty: 'gc', name: 'GROOVE COASTER', color: '#22125b' },
  { difficulty: 'diva', name: 'Project DIVA Arcade', color: '#6d8c8d' },
];

export default async function run() {
  const songsArray: Record<string, any>[][] = [];

  logger.info('Loading songs from JSON files ...');
  for (const { difficulty: gameCode } of difficultyMappingList) {
    if (!fs.existsSync(`${DIST_PATH}/../${gameCode}/data.json`)) {
      logger.warn(`- ${gameCode} (not found)`);
      // eslint-disable-next-line no-continue
      continue;
    }

    logger.info(`- ${gameCode}`);
    const json = fs.readFileSync(`${DIST_PATH}/../${gameCode}/data.json`, 'utf-8');
    const songsOfGame: Record<string, any>[] = JSON.parse(json).songs;

    for (const song of songsOfGame) {
      song.sheets = [
        {
          type: gameCode,
          difficulty: gameCode,
          level: null,
          levelValue: null,
          isSpecial: song.sheets[0].isSpecial,
        },
      ];
      song.imageName = `../../../${gameCode}/img/cover/${song.imageName}`;
    }

    songsArray.push(songsOfGame.slice().reverse());
  }

  const flatZip = (...arrs: any[][]) => [...Array(Math.max(...arrs.map((arr) => arr.length)))]
    .flatMap((_, i) => arrs.map((arr) => arr[i]).filter(Boolean));

  const output = {
    songs: flatZip(...songsArray).slice().reverse(),
    levels: [],
    categories: [],
    versions: [],
    types: [],
    difficulties: difficultyMappingList,
    regions: [],
    updateTime: new Date().toISOString(),
  };

  logger.info(`Writing output into ${DIST_PATH}/data.json ...`);
  fs.mkdirSync(DIST_PATH, { recursive: true });
  fs.writeFileSync(`${DIST_PATH}/data.json`, JSON.stringify(output, null, '\t'));

  logger.info('Done!');
}

if (require.main === module) run();

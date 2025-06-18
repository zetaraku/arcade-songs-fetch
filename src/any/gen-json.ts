import fs from 'node:fs';
import log4js from 'log4js';
import { makeOutput } from '@/_core/utils';

const logger = log4js.getLogger('any/gen-json');
logger.level = log4js.levels.INFO;

const DIST_PATH = 'dist/any';

const difficulties = [
  { difficulty: 'maimai', name: 'maimai', color: '#1976d2' },
  { difficulty: 'chunithm', name: 'CHUNITHM', color: '#f3a607' },
  { difficulty: 'wacca', name: 'WACCA', color: '#e50065' },
  { difficulty: 'taiko', name: '太鼓の達人', color: '#f50000' },
  { difficulty: 'jubeat', name: 'jubeat', color: '#134c43' },
  { difficulty: 'sdvx', name: 'SOUND VOLTEX', color: '#404040' },
  { difficulty: 'ongeki', name: 'オンゲキ', color: '#32b9cc' },
  { difficulty: 'gc', name: 'GROOVE COASTER', color: '#22125b' },
  { difficulty: 'diva', name: 'Project DIVA Arcade', color: '#6d8c8d' },
  { difficulty: 'popn', name: 'pop\'n music', color: '#ffaa00' },
  { difficulty: 'drs', name: 'DANCERUSH STARDOM', color: '#06a6fb' },
  { difficulty: 'ddr', name: 'DanceDanceRevolution', color: '#2484c5' },
  { difficulty: 'nostalgia', name: 'NOSTALGIA', color: '#633300' },
  { difficulty: 'crossbeats', name: 'crossbeats REV.', color: '#d0c334' },
  { difficulty: 'rb', name: 'REFLEC BEAT', color: '#52369d' },
  { difficulty: 'gitadora', name: 'GITADORA', color: '#21008d' },
  { difficulty: 'polarischord', name: 'ポラリスコード', color: '#695ca7' },
];

export default async function run() {
  const songsArray: Record<string, any>[][] = [];

  logger.info('Loading songs from JSON files ...');
  for (const { difficulty: gameCode } of difficulties) {
    if (!fs.existsSync(`${DIST_PATH}/../${gameCode}/data.json`)) {
      logger.warn(`- ${gameCode} (not found)`);
      // eslint-disable-next-line no-continue
      continue;
    }

    logger.info(`- ${gameCode}`);
    const json = fs.readFileSync(`${DIST_PATH}/../${gameCode}/data.json`, 'utf-8');
    const songsOfGame: Record<string, any>[] = JSON.parse(json).songs;

    for (const song of songsOfGame) {
      song.songId = `[${gameCode}] ${song.songId}`;
      song.sheets = [
        {
          type: gameCode,
          difficulty: gameCode,

          level: null,
          levelValue: null,

          noteDesigner: null,

          isSpecial: song.sheets[0].isSpecial,
        },
      ];
      song.imageName = `../../../${gameCode}/img/cover-m/${song.imageName}`;
    }

    songsArray.push(songsOfGame.slice().reverse());
  }

  const flatZip = (...arrs: any[][]) => [...Array(Math.max(...arrs.map((arr) => arr.length)))]
    .flatMap((_, i) => arrs.map((arr) => arr[i]).filter(Boolean));

  const output = makeOutput({
    songs: flatZip(...songsArray).slice().reverse(),
    categories: [],
    versions: [],
    types: [],
    difficulties,
    regions: [],
    updateTime: new Date().toISOString(),
  });

  logger.info(`Writing output into ${DIST_PATH}/data.json ...`);
  fs.mkdirSync(DIST_PATH, { recursive: true });
  fs.writeFileSync(`${DIST_PATH}/data.json`, JSON.stringify(output, null, '\t'));

  logger.info('Done!');
}

if (require.main === module) run();

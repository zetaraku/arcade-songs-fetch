import log4js from 'log4js';
import fetchImages from '@/core/fetch-images';
import { getCookies } from './fetch-songs';
import { Song } from './models';

const logger = log4js.getLogger('diva/fetch-images');
logger.level = log4js.levels.INFO;

const IMAGE_DIR_PATH = 'data/diva/img/cover';

export default async function run() {
  logger.info('Logging in to get the required cookies ...');
  const cookies = await getCookies();

  const songs = await Song.findAll<any>();
  await fetchImages(songs, IMAGE_DIR_PATH, logger, {
    Cookie: `JSESSIONID=${cookies.JSESSIONID};`,
  });
}

if (require.main === module) run();

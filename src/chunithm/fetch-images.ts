import log4js from 'log4js';
import { Song } from './models';
import fetchImages from '../core/fetch-images';

const logger = log4js.getLogger('chunithm/fetch-images');
logger.level = log4js.levels.INFO;

const IMAGE_DIR_PATH = 'data/chunithm/img/cover';

export default async function run() {
  const songs = await Song.findAll<any>();
  await fetchImages(songs, IMAGE_DIR_PATH, logger);
}

if (require.main === module) run();

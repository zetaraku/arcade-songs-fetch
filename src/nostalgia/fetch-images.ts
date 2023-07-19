import log4js from 'log4js';
import fetchImages from '@/_core/fetch-images';
import { Song } from '@@/db/nostalgia/models';
import { getCookies } from './fetch-songs';

const logger = log4js.getLogger('nostalgia/fetch-images');
logger.level = log4js.levels.INFO;

export default async function run() {
  logger.info('Logging in to get the required cookies ...');
  const cookies = await getCookies();

  const gameCode = 'nostalgia';
  const songs = await Song.findAll<any>();
  await fetchImages(gameCode, songs, { Cookie: `M573SSID=${cookies.M573SSID};` });
}

if (require.main === module) run();

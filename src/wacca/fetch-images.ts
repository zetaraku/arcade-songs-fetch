/* eslint-disable no-await-in-loop */
import fs from 'fs';
import download from 'download';
import sleep from 'sleep-promise';
import log4js from 'log4js';
import { Song } from './models';

const logger = log4js.getLogger('wacca/fetch-images');
logger.level = log4js.levels.INFO;

const IMAGE_DIR_PATH = 'data/wacca/img/cover';

export default async function run() {
  const songs = await Song.findAll<any>();

  logger.info('Downloading cover image for songs ...');
  for (const [index, song] of songs.entries()) {
    if (song.imageName && !fs.existsSync(`${IMAGE_DIR_PATH}/${song.imageName}`)) {
      logger.info(`(${1 + index} / ${songs.length}) ${song.title}`);
      await download(song.imageUrl, IMAGE_DIR_PATH, { filename: song.imageName });

      await sleep(100);
    }
  }

  logger.info('Done!');
}

if (require.main === module) run();

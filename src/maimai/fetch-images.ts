/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import fs from 'fs';
import https from 'https';
import download from 'download';
import sleep from 'sleep-promise';
import log4js from 'log4js';
import { Song } from './models';

const logger = log4js.getLogger('maimai/fetch-images');
logger.level = log4js.levels.INFO;

// fix missing certificate
https.globalAgent.options.ca = fs.readFileSync('node_modules/node_extra_ca_certs_mozilla_bundle/ca_bundle/ca_intermediate_root_bundle.pem');

const IMAGE_DIR_PATH = 'data/maimai/img/cover';

export default async function run() {
  const songs = await Song.findAll<any>();

  logger.info('Downloading cover image for songs ...');
  for (const [index, song] of songs.entries()) {
    if (!fs.existsSync(`${IMAGE_DIR_PATH}/${song.imageName}`)) {
      logger.info(`(${1 + index} / ${songs.length}) ${song.title}`);
      await download(song.imageUrl, IMAGE_DIR_PATH, { filename: song.imageName });

      await sleep(100);
    }
  }

  logger.info('Done!');
}

if (require.main === module) run();

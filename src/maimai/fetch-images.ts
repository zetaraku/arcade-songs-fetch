import fs from 'fs';
import https from 'https';
import log4js from 'log4js';
import { Song } from './models';
import fetchImages from '../core/fetch-images';

const logger = log4js.getLogger('maimai/fetch-images');
logger.level = log4js.levels.INFO;

// fix missing certificate
https.globalAgent.options.ca = fs.readFileSync('node_modules/node_extra_ca_certs_mozilla_bundle/ca_bundle/ca_intermediate_root_bundle.pem');

const IMAGE_DIR_PATH = 'data/maimai/img/cover';

export default async function run() {
  const songs = await Song.findAll<any>();
  await fetchImages(songs, IMAGE_DIR_PATH, logger);
}

if (require.main === module) run();

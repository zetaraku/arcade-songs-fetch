import fs from 'node:fs';
import https from 'node:https';
import fetchImages from '@/_core/fetch-images';
import { Song } from '@@/db/maimai/models';

// fix missing certificate
https.globalAgent.options.ca = fs.readFileSync('node_modules/node_extra_ca_certs_mozilla_bundle/ca_bundle/ca_intermediate_root_bundle.pem');

export default async function run() {
  const gameCode = 'maimai';
  const songs = await Song.findAll<any>();
  await fetchImages(gameCode, songs);
}

if (require.main === module) run();

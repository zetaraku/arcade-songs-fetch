/* eslint-disable no-await-in-loop */
import fs from 'node:fs';
import download from 'download';
import sleep from 'sleep-promise';
import log4js from 'log4js';

export default async function run(
  gameCode: string,
  songs: Record<string, any>[],
  headers?: Record<string, string>,
) {
  const logger = log4js.getLogger(`${gameCode}/fetch-images`);
  logger.level = log4js.levels.INFO;

  const imageDir = `img/${gameCode}/cover`;

  logger.info('Downloading cover image for songs ...');
  for (const [index, song] of songs.entries()) {
    if (song.imageName && !fs.existsSync(`${imageDir}/${song.imageName}`)) {
      logger.info(`(${1 + index} / ${songs.length}) ${song.title}`);
      await download(song.imageUrl, imageDir, { filename: song.imageName, headers });
      await sleep(100);
    }
  }

  logger.info('Done!');
}

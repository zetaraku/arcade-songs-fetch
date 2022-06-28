/* eslint-disable no-await-in-loop */
import fs from 'node:fs';
import download from 'download';
import sleep from 'sleep-promise';
import log4js from 'log4js';

export default async function run(
  songs: Record<string, any>[],
  imageDir: string,
  logger: log4js.Logger,
  headers: Record<string, string> = {},
) {
  logger.info('Downloading cover image for songs ...');
  for (const [index, song] of songs.entries()) {
    if (song.imageName && !fs.existsSync(`${imageDir}/${song.imageName}`)) {
      logger.info(`(${1 + index} / ${songs.length}) ${song.title}`);
      await download(song.imageUrl, imageDir, {
        filename: song.imageName,
        headers,
      });

      await sleep(100);
    }
  }

  logger.info('Done!');
}

/* eslint-disable no-await-in-loop */
import fs from 'node:fs';
import childProcess from 'node:child_process';
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

  const coverImgDir = `data/${gameCode}/img/cover`;
  const coverImgWebpDir = `data/${gameCode}/img/cover-m`;

  logger.info('* Downloading cover image for songs ...');
  for (const [index, song] of songs.entries()) {
    if (song.imageName && !fs.existsSync(`${coverImgDir}/${song.imageName}`)) {
      logger.info(`(${1 + index} / ${songs.length}) ${song.title}`);
      await download(song.imageUrl, coverImgDir, { filename: song.imageName, headers });
      await sleep(100);
    }
  }

  const cwebpBinPath = (await import('cwebp-bin')).default as string;

  logger.info('* Converting images into .webp format ...');
  fs.mkdirSync(coverImgWebpDir, { recursive: true });
  for (const [, song] of songs.entries()) {
    if (song.imageName && !fs.existsSync(`${coverImgWebpDir}/${song.imageName}`)) {
      // logger.info(`(${1 + index} / ${songs.length}) ${song.title}`);
      childProcess.execFileSync(cwebpBinPath, [`${coverImgDir}/${song.imageName}`, '-o', `${coverImgWebpDir}/${song.imageName}`, '-quiet']);
    }
  }

  logger.info('Done!');
}

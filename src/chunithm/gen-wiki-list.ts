import fs from 'node:fs';
import Sequelize from 'sequelize';
import log4js from 'log4js';
import { sequelize } from '@@/db/chunithm/models';
import { getSongWikiTitle } from './fetch-sheet-extras-v1';

const logger = log4js.getLogger('chunithm/gen-wiki-list');
logger.level = log4js.levels.INFO;

const DATA_PATH = 'data/chunithm';

export default async function run() {
  const songs: Record<string, any>[] = await sequelize.query(/* sql */ `
    SELECT "songId", "title"
    FROM "Songs"
    WHERE "category" <> 'WORLD''S END'
  `, {
    type: Sequelize.QueryTypes.SELECT,
  });

  const outputText = songs
    .map((song) => getSongWikiTitle(song))
    .map((e) => `- [[${e}]]\n`)
    .join('');

  logger.info(`Writing output into ${DATA_PATH}/wiki.txt ...`);
  fs.mkdirSync(DATA_PATH, { recursive: true });
  fs.writeFileSync(`${DATA_PATH}/wiki.txt`, outputText);

  logger.info('Done!');
}

if (require.main === module) run();

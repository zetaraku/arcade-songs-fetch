/* eslint-disable dot-notation */
import shell from 'shelljs';
import log4js from 'log4js';
import 'dotenv/config';

const logger = log4js.getLogger('taiko/upload-data');
logger.level = log4js.levels.INFO;

shell.env['GAME_CODE'] = 'taiko';

export default async function run() {
  logger.info('Uploading data and images ...');
  shell.exec('bash src/core/upload-data.bash');
}

if (require.main === module) run();

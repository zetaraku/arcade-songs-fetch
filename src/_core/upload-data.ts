import shell from 'shelljs';
import log4js from 'log4js';
import 'dotenv/config';

export default async function run(gameCode: string) {
  if (!gameCode) {
    throw new Error('GAME_CODE is not set.');
  }

  const logger = log4js.getLogger(`${gameCode}/upload-data`);
  logger.level = log4js.levels.INFO;

  logger.info('Uploading data and images ...');
  shell.exec('bash src/_core/upload-data.bash', {
    env: {
      ...process.env,
      GAME_CODE: gameCode,
    },
  });

  logger.info('Done!');
}

if (require.main === module) run(process.argv[2]);

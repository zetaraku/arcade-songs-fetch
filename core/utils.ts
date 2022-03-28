import crypto from 'crypto';
import log4js from 'log4js';

const logger = log4js.getLogger('core/utils');
logger.level = log4js.levels.INFO;

export function hashed(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

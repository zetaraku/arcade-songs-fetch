import crypto from 'crypto';

export function hashed(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

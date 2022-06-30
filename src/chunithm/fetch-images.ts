import fetchImages from '@/core/fetch-images';
import { Song } from '@@/db/chunithm/models';

export default async function run() {
  const gameCode = 'chunithm';
  const songs = await Song.findAll<any>();
  await fetchImages(gameCode, songs);
}

if (require.main === module) run();

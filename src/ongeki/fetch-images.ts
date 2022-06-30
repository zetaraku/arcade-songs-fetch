import fetchImages from '@/core/fetch-images';
import { Song } from '@@/db/ongeki/models';

export default async function run() {
  const gameCode = 'ongeki';
  const songs = await Song.findAll<any>();
  await fetchImages(gameCode, songs);
}

if (require.main === module) run();

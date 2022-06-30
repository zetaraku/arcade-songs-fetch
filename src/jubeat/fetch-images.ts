import fetchImages from '@/core/fetch-images';
import { Song } from '@@/db/jubeat/models';

export default async function run() {
  const gameCode = 'jubeat';
  const songs = await Song.findAll<any>();
  await fetchImages(gameCode, songs);
}

if (require.main === module) run();

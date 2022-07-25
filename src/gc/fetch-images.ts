import fetchImages from '@/_core/fetch-images';
import { Song } from '@@/db/gc/models';

export default async function run() {
  const gameCode = 'gc';
  const songs = await Song.findAll<any>();
  await fetchImages(gameCode, songs);
}

if (require.main === module) run();

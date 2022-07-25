import fetchImages from '@/_core/fetch-images';
import { Song } from '@@/db/wacca/models';

export default async function run() {
  const gameCode = 'wacca';
  const songs = await Song.findAll<any>();
  await fetchImages(gameCode, songs);
}

if (require.main === module) run();

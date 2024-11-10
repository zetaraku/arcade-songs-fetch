import fetchImages from '@/_core/fetch-images';
import { Song } from '@@/db/popn/models';

export default async function run() {
  const gameCode = 'popn';
  const songs = await Song.findAll<any>();
  await fetchImages(gameCode, songs);
}

if (require.main === module) run();

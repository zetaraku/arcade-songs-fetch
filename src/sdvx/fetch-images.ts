import fetchImages from '@/core/fetch-images';
import { Song } from '@@/db/sdvx/models';

export default async function run() {
  const gameCode = 'sdvx';
  const songs = await Song.findAll<any>();
  await fetchImages(gameCode, songs);
}

if (require.main === module) run();

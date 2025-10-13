import fetchImages from '@/_core/fetch-images';
import { Song } from '@@/db/museca/models';

export default async function run() {
  const gameCode = 'museca';
  const songs = await Song.findAll<any>();
  await fetchImages(gameCode, songs);
}

if (require.main === module) run();

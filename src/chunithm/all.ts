import fetchSongs from './fetch-songs';
import fetchImages from './fetch-images';
import fetchIntlSheets from './fetch-intl-sheets';
import genJson from './gen-json';
import uploadData from './upload-data';

export default async function run() {
  await fetchSongs();
  await fetchImages();
  await fetchIntlSheets();
  await genJson();
  await uploadData();
}

if (require.main === module) run();

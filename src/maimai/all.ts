import fetchSongs from './fetch-songs';
import fetchImages from './fetch-images';
import fetchVersions from './fetch-versions';
import fetchIntlSheets from './fetch-intl-sheets';
import fetchCnSheets from './fetch-cn-sheets';
import fetchExtras from './fetch-extras';
import genJson from './gen-json';
import uploadData from './upload-data';

export default async function run() {
  await fetchSongs();
  await fetchImages();
  await fetchVersions();
  await fetchIntlSheets();
  await fetchCnSheets();
  await fetchExtras();
  await genJson();
  await uploadData();
}

if (require.main === module) run();

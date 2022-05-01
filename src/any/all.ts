import genJson from './gen-json';
import uploadData from './upload-data';

export default async function run() {
  await genJson();
  await uploadData();
}

if (require.main === module) run();

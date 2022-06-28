import log4js from 'log4js';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { SheetInternalLevel } from './models';
import 'dotenv/config';

const logger = log4js.getLogger('maimai/fetch-internal-levels');
logger.level = log4js.levels.INFO;

const typeMapping = new Map([
  ['STD', 'std'],
  ['DX', 'dx'],
]);
const difficultyMapping = new Map([
  ['EXP', 'expert'],
  ['MAS', 'master'],
  ['ReMAS', 'remaster'],
]);

const manualMappings = new Map([
  ['雷切 -RAIKIRI-', '雷切-RAIKIRI-'],
  ['Sqlupp(Camellia\'s Sqleipd*Hiytex Remix)', 'Sqlupp (Camellia\'s "Sqleipd*Hiytex" Remix)'],
  ['≠彡゛/了→', '≠彡"/了→'],
  ['System "Z"', 'System “Z”'],
  ['Seclet Sleuth', 'Secret Sleuth'],
  ['オパ！オパ！RACER -GMT mashup-', 'オパ! オパ! RACER -GMT mashup-'],
  ['ウッーウッーウマウマ( ﾟ∀ﾟ)', 'ウッーウッーウマウマ(ﾟ∀ﾟ)'],
  ['L4TS:2018(feat.あひる＆KTA)', 'L4TS:2018 (feat. あひる & KTA)'],
  ['D✪N’T ST✪P R✪CKIN’', 'D✪N’T  ST✪P  R✪CKIN’'],
  ['REVIVER オルタンシア･サーガ-蒼の騎士団- オリジナルVer.', 'REVIVER オルタンシア・サーガ -蒼の騎士団- オリジナルVer.'],
  [null, '　'],
  ['紅星ミゼラブル〜廃憶編', '紅星ミゼラブル～廃憶編'],
  ['Seyana.～何でも言うことをきいてくれるアカネチャン～', 'Seyana. ～何でも言うことを聞いてくれるアカネチャン～'],
  ['Backyun! -悪い女-', 'Backyun! －悪い女－'],
  ['Caliburne ～Story of the Legendary Sword～', 'Caliburne ～Story of the Legendary sword～'],
  ['Mjolnir', 'Mjölnir'],
  ['Love’s Theme of BADASS ～バッド・アス 愛のテーマ～', 'Love\'s Theme of BADASS ～バッド・アス 愛のテーマ～'],
]);

function getSongId(title: string) {
  //! hotfix
  if (title === 'Link') {
    throw new Error(`Title required manual resolve: ${title}`);
  }
  if (manualMappings.has(title)) {
    return manualMappings.get(title);
  }
  return String(title);
}

function extractSheets(rawSheet: Record<string, any>) {
  return {
    songId: getSongId(rawSheet.title),
    ...rawSheet,
  };
}

async function fetchSheets() {
  if (!process.env.GOOGLE_API_KEY) {
    throw new Error('Please set your GOOGLE_API_KEY in the .env file');
  }

  const spreadsheet = new GoogleSpreadsheet('1byBSBQE547KL2KzPkUjY45svcIrJeHh57h-DLJycQbs');
  spreadsheet.useApiKey(process.env.GOOGLE_API_KEY!);
  await spreadsheet.loadInfo();

  // eslint-disable-next-line dot-notation
  const sheet = spreadsheet.sheetsByTitle['Tmai'];
  await sheet.loadCells();

  const result = [...Array(sheet.rowCount).keys()]
    .filter((i) => typeof sheet.getCell(i, 18).value === 'number' && sheet.getCell(i, 18).value > 0)
    .map((i) => ({
      title: sheet.getCell(i, 1).value,
      type: typeMapping.get(sheet.getCell(i, 10).value as string),
      difficulty: difficultyMapping.get(sheet.getCell(i, 11).value as string),
      internalLevel: (sheet.getCell(i, 18).value as number).toFixed(1),
    }));

  return result;
}

export default async function run() {
  logger.info('Fetching data from RCMF Google Sheets ...');
  const rawSheets = await fetchSheets();
  logger.info(`OK, ${rawSheets.length} sheets fetched.`);

  logger.info('Preparing SheetInternalLevel table ...');
  await SheetInternalLevel.sync();

  logger.info('Truncating and Inserting sheetInternalLevels ...');
  const sheets = rawSheets.map((rawSheet) => extractSheets(rawSheet));
  await SheetInternalLevel.truncate();
  await SheetInternalLevel.bulkCreate(sheets, { ignoreDuplicates: true });

  logger.info('Done!');
}

if (require.main === module) run();

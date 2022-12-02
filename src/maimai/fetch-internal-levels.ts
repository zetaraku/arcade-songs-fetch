import log4js from 'log4js';
import { GoogleSpreadsheet, GoogleSpreadsheetWorksheet } from 'google-spreadsheet';
import { SheetInternalLevel } from '@@/db/maimai/models';
import 'dotenv/config';

const logger = log4js.getLogger('maimai/fetch-internal-levels');
logger.level = log4js.levels.INFO;

const levelSheetNames = ['14以上', '13+', '13', '12+', '12'];
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
  ['Baban!!  ー甘い罠ー', 'BaBan!! －甘い罠－'],
  ['スカーレット警察のゲットーパトロール２４時', 'スカーレット警察のゲットーパトロール24時'],
  ['ファンタジーゾーンOPA!-OPA! -GMT remix-', 'ファンタジーゾーン OPA-OPA! -GMT remix-'],
  // Dummy entries:
  ['(  Ꙭ)ﾌﾞｯｺﾛﾘ食べよう', undefined],
  ['実験', undefined],
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

function extractSheet(rawSheet: Record<string, any>) {
  return {
    songId: getSongId(rawSheet.title),
    ...rawSheet,
  };
}

async function parseLevelSheet(sheet: GoogleSpreadsheetWorksheet) {
  await sheet.loadCells();
  const result = [];

  for (let col = 0; col + 5 < sheet.columnCount; col += 7) {
    for (let row = 3; row < sheet.rowCount; row += 1) {
      const cell = sheet.getCell(row, col);
      const chartConstantCell = sheet.getCell(row, col + 5);

      // backgroundColor notes the start of a new difficulty/category group
      if (cell.value !== null
          && !chartConstantCell.formulaError
          && !Number.isNaN(parseFloat(chartConstantCell.value as string))
      ) {
        result.push({
          title: cell.value,
          type: typeMapping.get(sheet.getCell(row, col + 2).value as string),
          difficulty: difficultyMapping.get(sheet.getCell(row, col + 3).value as string),
          internalLevel: (chartConstantCell.value as number).toFixed(1),
        });
      }
    }
  }

  return result;
}

async function fetchSheetsV6() {
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

  const extra = await Promise.all(
    levelSheetNames.map((name) => parseLevelSheet(spreadsheet.sheetsByTitle[name])),
  );
  result.push(...extra.flat());

  return result;
}

async function fetchSheetsV7() {
  if (!process.env.GOOGLE_API_KEY) {
    throw new Error('Please set your GOOGLE_API_KEY in the .env file');
  }

  const spreadsheet = new GoogleSpreadsheet('1xbDMo-36bGL_d435Oy8TTVq4ADFmxl9sYFqhTXiJYRg');
  spreadsheet.useApiKey(process.env.GOOGLE_API_KEY!);
  await spreadsheet.loadInfo();

  // eslint-disable-next-line dot-notation
  const sheet = spreadsheet.sheetsByTitle['Tmai'];
  await sheet.loadCells();

  const result = [...Array(sheet.rowCount).keys()]
    .filter((i) => typeof sheet.getCell(i, 7).value === 'number' && sheet.getCell(i, 7).value > 0)
    .map((i) => ({
      title: sheet.getCell(i, 1).value,
      type: typeMapping.get(sheet.getCell(i, 2).value as string),
      difficulty: difficultyMapping.get(sheet.getCell(i, 3).value as string),
      internalLevel: (sheet.getCell(i, 7).value as number).toFixed(1),
    }));

  const extra = await Promise.all(
    levelSheetNames.map((name) => parseLevelSheet(spreadsheet.sheetsByTitle[name])),
  );
  result.push(...extra.flat());

  return result;
}

export default async function run() {
  logger.info('Fetching data from RCMF Google Sheets ...');
  const rawSheets = [
    ...await fetchSheetsV6(),
    ...await fetchSheetsV7(),
  ];
  logger.info(`OK, ${rawSheets.length} sheets fetched.`);

  logger.info('Updating sheetInternalLevels ...');
  const sheets = rawSheets
    .map((rawSheet) => extractSheet(rawSheet))
    .filter((rawSheet) => rawSheet.songId !== undefined);
  await Promise.all(sheets.map((sheet) => SheetInternalLevel.upsert(sheet)));

  logger.info('Done!');
}

if (require.main === module) run();

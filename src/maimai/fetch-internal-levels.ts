import log4js from 'log4js';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { Song, SheetInternalLevel } from '@@/db/maimai/models';
import { checkUnmatchedEntries } from '@/_core/utils';
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
  ['Baban!!  ー甘い罠ー', 'BaBan!! －甘い罠－'],
  ['スカーレット警察のゲットーパトロール２４時', 'スカーレット警察のゲットーパトロール24時'],
  ['ファンタジーゾーンOPA!-OPA! -GMT remix-', 'ファンタジーゾーン OPA-OPA! -GMT remix-'],
  ['Save This World νMix', 'Save This World νMIX'],
  ['“411Ψ892”', '"411Ψ892"'],
  ['Tic Tac DREAMIN\'', 'Tic Tac DREAMIN’'],
  ['Good Bye, Merry-Go-Round.', 'Good bye, Merry-Go-Round.'],
  ['Got more raves?', 'Got more raves？'],
  ['Session High↑', 'Session High⤴'],
  ['ぼくたちいつでもしゅわっしゅわ！', 'ぼくたちいつでも　しゅわっしゅわ！'],
  ['Boys O\'Clock', 'Boys O’Clock'],
  ['God Knows…', 'God knows...'],
  ['Turn Around', 'Turn around'],
  ['ガチャガチャきゅ～と・ふぃぎゅ＠メイト', 'ガチャガチャきゅ～と・ふぃぎゅ@メイト'],
  ['砂の惑星 feat.HATSUNE MIKU', '砂の惑星 feat. HATSUNE MIKU'],
  ['Seyana.～何でも言うことを聞いてくれるアカネチャン～', 'Seyana. ～何でも言うことを聞いてくれるアカネチャン～'],
  ['レッツゴー！陰陽師', 'レッツゴー!陰陽師'],
  ['チルノのパーフェクトさんすう教室 ⑨周年バージョン', 'チルノのパーフェクトさんすう教室　⑨周年バージョン'],
  ['【東方ニコカラ】秘神マターラfeat.魂音泉【IOSYS】', '【東方ニコカラ】秘神マターラ feat.魂音泉【IOSYS】'],
  ['Change Our MIRAI!', 'Change Our MIRAI！'],
  ['Jorqer', 'Jörqer'],
  ['赤心性:カマトト荒療治', '赤心性：カマトト荒療治'],
  ['Party 4U "holy nite mix"', 'Party 4U ”holy nite mix”'],
  ['L\'epilogue', 'L\'épilogue'],
  ['管弦楽組曲 第3番 ニ長調「第2曲(G線上のアリア)」BWV.1068-2', '管弦楽組曲 第3番 ニ長調「第2曲（G線上のアリア）」BWV.1068-2'],
  ['GRANDIR', 'GRÄNDIR'],
  ['FREEDOM DiVE(tpz Overcute Remix)', 'FREEDOM DiVE (tpz Overcute Remix)'],
  ['Excalibur ～Revived Resolution～', 'Excalibur ～Revived resolution～'],
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

  return result;
}

export default async function run() {
  logger.info('Fetching data from internal level source ...');
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

  logger.info('Checking unmatched songIds ...');
  checkUnmatchedEntries(
    (await SheetInternalLevel.findAll<any>()).map((sheet) => sheet.songId),
    (await Song.findAll<any>()).map((song) => song.songId),
  );

  logger.info('Done!');
}

if (require.main === module) run();

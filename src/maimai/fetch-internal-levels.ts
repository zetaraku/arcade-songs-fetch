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
  ['ATLUS RUSH', 'ATLAS RUSH'],
  ['Agitation!', 'Agitation！'],
  ['Alea jacta est', 'Alea jacta est!'],
  ['Baban!!  ー甘い罠ー', 'BaBan!! －甘い罠－'],
  ['Backyun! -悪い女-', 'Backyun! －悪い女－'],
  ['Bad Apple!! feat nomico', 'Bad Apple!! feat.nomico'],
  ['Bad Apple!! feat.nomico 〜五十嵐撫子Ver.〜', 'Bad Apple!! feat.nomico ～五十嵐 撫子 Ver.～'],
  ['Bad Apple!! feat.nomico(REDALiCE Remix)', 'Bad Apple!! feat.nomico (REDALiCE Remix)'],
  ['Boys O\'Clock', 'Boys O’Clock'],
  ['Caliburne ～Story of the Legendary Sword～', 'Caliburne ～Story of the Legendary sword～'],
  ['Change Our MIRAI!', 'Change Our MIRAI！'],
  ['City Escape:Act1', 'City Escape: Act1'],
  ['Cyber Sparks', 'CYBER Sparks'],
  ['D✪N’T ST✪P R✪CKIN’', 'D✪N’T  ST✪P  R✪CKIN’'],
  ['Excalibur ～Revived Resolution～', 'Excalibur ～Revived resolution～'],
  ['FREEDOM DiVE(tpz Overcute Remix)', 'FREEDOM DiVE (tpz Overcute Remix)'],
  ['GRANDIR', 'GRÄNDIR'],
  ['God Knows…', 'God knows...'],
  ['Good Bye, Merry-Go-Round.', 'Good bye, Merry-Go-Round.'],
  ['Got more raves?', 'Got more raves？'],
  ['Help me, ERINNNNNN!! （Band ver.）', 'Help me, ERINNNNNN!!（Band ver.）'],
  ['Imperishable Night 2006(2016 Refine)', 'Imperishable Night 2006 (2016 Refine)'],
  ['Jack-the-Ripper♦', 'Jack-the-Ripper◆'],
  ['Jorqer', 'Jörqer'],
  ['L4TS:2018 (feat. あひる ＆ KTA)', 'L4TS:2018 (feat. あひる & KTA)'],
  ['L4TS:2018(feat.あひる＆KTA)', 'L4TS:2018 (feat. あひる & KTA)'],
  ['L\'epilogue', 'L\'épilogue'],
  ['Love kills U', 'Love Kills U'],
  ['Love’s Theme of BADASS ～バッド・アス 愛のテーマ～', 'Love\'s Theme of BADASS ～バッド・アス 愛のテーマ～'],
  ['Melody!', 'Melody！'],
  ['Mjolnir', 'Mjölnir'],
  ['Party 4U "holy nite mix"', 'Party 4U ”holy nite mix”'],
  ['Quartet Theme[Reborn]', 'Quartet Theme [Reborn]'],
  ['REVIVER オルタンシア･サーガ-蒼の騎士団- オリジナルVer.', 'REVIVER オルタンシア・サーガ -蒼の騎士団- オリジナルVer.'],
  ['Re:End of a Dream', 'Re：End of a Dream'],
  ['Retribution 〜 Cycle of Redemption 〜', 'Retribution ～ Cycle of Redemption ～'],
  ['Rooftop Run: Act１', 'Rooftop Run: Act1'],
  ['Rooftop Run:Act1', 'Rooftop Run: Act1'],
  ['R’N’R Monsta', 'R\'N\'R Monsta'],
  ['SQUAD -Phvntom-', 'SQUAD-Phvntom-'],
  ['Save This World νMix', 'Save This World νMIX'],
  ['Seclet Sleuth', 'Secret Sleuth'],
  ['Session High↑', 'Session High⤴'],
  ['Seyana.～何でも言うことをきいてくれるアカネチャン～', 'Seyana. ～何でも言うことを聞いてくれるアカネチャン～'],
  ['Seyana.～何でも言うことを聞いてくれるアカネチャン～', 'Seyana. ～何でも言うことを聞いてくれるアカネチャン～'],
  ['Sky High[Reborn]', 'Sky High [Reborn]'],
  ['Sqlupp(Camellia\'s Sqleipd*Hiytex Remix)', 'Sqlupp (Camellia\'s "Sqleipd*Hiytex" Remix)'],
  ['Sweetie×2', 'Sweetiex2'],
  ['System "Z"', 'System “Z”'],
  ['Tic Tac DREAMIN\'', 'Tic Tac DREAMIN’'],
  ['Turn Around', 'Turn around'],
  ['Urban Crusher[Remix]', 'Urban Crusher [Remix]'],
  ['YA･DA･YO[Reborn]', 'YA･DA･YO [Reborn]'],
  ['Yakumo>>JOINT STRUGGLE(2019 update)', 'Yakumo >>JOINT STRUGGLE (2019 Update)'],
  ['falling', 'Falling'],
  ['null', '　'],
  ['Åntinomiε', 'Åntinomiε'],
  ['“411Ψ892”', '"411Ψ892"'],
  ['≠彡゛/了→', '≠彡"/了→'],
  ['【東方ニコカラ】秘神マターラfeat.魂音泉【IOSYS】', '【東方ニコカラ】秘神マターラ feat.魂音泉【IOSYS】'],
  ['ずんだもんの朝食　～目覚ましずんラップ～', 'ずんだもんの朝食　〜目覚ましずんラップ〜'],
  ['なだめスかし Negotiation(TVsize)', 'なだめスかし Negotiation（TVsize）'],
  ['はげしこの夜-Psylent Crazy Night-', 'はげしこの夜 -Psylent Crazy Night-'],
  ['ぼくたちいつでもしゅわっしゅわ！', 'ぼくたちいつでも　しゅわっしゅわ！'],
  ['ウッーウッーウマウマ( ﾟ∀ﾟ)', 'ウッーウッーウマウマ(ﾟ∀ﾟ)'],
  ['オパ！オパ！RACER -GMT mashup-', 'オパ! オパ! RACER -GMT mashup-'],
  ['オーケー？オーライ！', 'オーケー？　オーライ！'],
  ['ガチャガチャきゅ～と・ふぃぎゅ＠メイト', 'ガチャガチャきゅ～と・ふぃぎゅ@メイト'],
  ['スカーレット警察のゲットーパトロール２４時', 'スカーレット警察のゲットーパトロール24時'],
  ['チルノのパーフェクトさんすう教室 ⑨周年バージョン', 'チルノのパーフェクトさんすう教室　⑨周年バージョン'],
  ['トルコ行進曲 -オワタ＼(^o^)／', 'トルコ行進曲 - オワタ＼(^o^)／'],
  ['ナイト・オブ・ナイツ(Cranky Remix)', 'ナイト・オブ・ナイツ (Cranky Remix)'],
  ['ファンタジーゾーンOPA!-OPA! -GMT remix-', 'ファンタジーゾーン OPA-OPA! -GMT remix-'],
  ['プラネタリウム・レビュー', 'プラネタリウム・レヴュー'],
  ['レッツゴー！陰陽師', 'レッツゴー!陰陽師'],
  ['夜明けまであと3秒', '夜明けまであと３秒'],
  ['天狗の落とし文 feat.ｙｔｒ', '天狗の落とし文 feat. ｙｔｒ'],
  ['好きな総菜発表ドラゴン', '好きな惣菜発表ドラゴン'],
  ['教えて!!魔法のLyric', '教えて!! 魔法のLyric'],
  ['曖昧Mind', '曖昧mind'],
  ['泣き虫O\'Clock', '泣き虫O\'clock'],
  ['砂の惑星 feat.HATSUNE MIKU', '砂の惑星 feat. HATSUNE MIKU'],
  ['管弦楽組曲 第3番 ニ長調「第2曲(G線上のアリア)」BWV.1068-2', '管弦楽組曲 第3番 ニ長調「第2曲（G線上のアリア）」BWV.1068-2'],
  ['紅星ミゼラブル〜廃憶編', '紅星ミゼラブル～廃憶編'],
  ['赤心性:カマトト荒療治', '赤心性：カマトト荒療治'],
  ['超熊猫的周遊記(ワンダーパンダートラベラー)', '超熊猫的周遊記（ワンダーパンダートラベラー）'],
  ['雷切 -RAIKIRI-', '雷切-RAIKIRI-'],
  // Dummy entries:
  ['(  Ꙭ)ﾌﾞｯｺﾛﾘ食べよう', undefined],
  ['test', undefined],
  ['実験', undefined],
]);

function getSongId(rawSheet: Record<string, any>) {
  const { title } = rawSheet;
  if (title === 'Link') {
    logger.warn('Title requires manual resolve:', rawSheet);
    return undefined;
  }
  if (manualMappings.has(title)) return manualMappings.get(title);
  return title;
}

function extractSheet(rawSheet: Record<string, any>) {
  return {
    songId: getSongId(rawSheet),
    ...rawSheet,
  };
}

async function extractRecords({
  spreadsheet,
  sheetName,
  dataIndexes,
  dataOffsets,
}: {
  spreadsheet: GoogleSpreadsheet,
  sheetName: string,
  dataIndexes: number[],
  dataOffsets: number[],
}) {
  const sheet = spreadsheet.sheetsByTitle[sheetName];
  await sheet.loadCells();

  logger.info(`Reading data from ${sheetName} at column ${dataIndexes} ...`);

  return dataIndexes.flatMap((dataIndex) => {
    const [
      titleIndex,
      typeIndex,
      difficultyIndex,
      internalLevelIndex,
    ] = dataOffsets.map((offset) => dataIndex + offset);

    const rawSheets = [...Array(sheet.rowCount).keys()]
      .filter((rowIndex) => {
        const internalLevelValue = sheet.getCell(rowIndex, internalLevelIndex).value;
        return typeof internalLevelValue === 'number' && internalLevelValue > 0;
      })
      .map((rowIndex) => ({
        title: String(sheet.getCell(rowIndex, titleIndex).value),
        type: typeMapping.get(String(sheet.getCell(rowIndex, typeIndex).value)),
        difficulty: difficultyMapping.get(String(sheet.getCell(rowIndex, difficultyIndex).value)),
        internalLevel: Number(sheet.getCell(rowIndex, internalLevelIndex).value).toFixed(1),
      }));

    logger.info(`* found ${rawSheets.length} record(s) at column ${dataIndex}`);

    return rawSheets;
  });
}

async function fetchSheetsV6() {
  const spreadsheet = new GoogleSpreadsheet('1byBSBQE547KL2KzPkUjY45svcIrJeHh57h-DLJycQbs');
  spreadsheet.useApiKey(process.env.GOOGLE_API_KEY!);
  await spreadsheet.loadInfo();

  return [
    ...await extractRecords({
      spreadsheet,
      sheetName: 'UNiVERSEPLUS新曲枠',
      dataIndexes: [0, 5, 10, 15, 20],
      dataOffsets: [0, 1, 2, 3],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '14以上',
      dataIndexes: [0, 7, 14, 21],
      dataOffsets: [0, 2, 3, 5],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '13+',
      dataIndexes: [0, 7, 14],
      dataOffsets: [0, 2, 3, 5],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '13',
      dataIndexes: [0, 7, 14, 21, 28, 35],
      dataOffsets: [0, 2, 3, 5],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '12+',
      dataIndexes: [0, 6, 12, 18, 24, 30],
      dataOffsets: [0, 1, 2, 4],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '12',
      dataIndexes: [0, 6, 12, 18, 24, 30, 36],
      dataOffsets: [0, 1, 2, 4],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: 'Tmai',
      dataIndexes: [0],
      dataOffsets: [1, 10, 11, 18],
    }),
  ];
}

async function fetchSheetsV7() {
  const spreadsheet = new GoogleSpreadsheet('1xbDMo-36bGL_d435Oy8TTVq4ADFmxl9sYFqhTXiJYRg');
  spreadsheet.useApiKey(process.env.GOOGLE_API_KEY!);
  await spreadsheet.loadInfo();

  return [
    ...await extractRecords({
      spreadsheet,
      sheetName: 'FESTiVAL新曲',
      dataIndexes: [0, 6, 12, 18, 24],
      dataOffsets: [0, 1, 2, 4],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '14以上',
      dataIndexes: [0, 7, 14, 21],
      dataOffsets: [0, 2, 3, 5],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '13+',
      dataIndexes: [0, 7, 14],
      dataOffsets: [0, 2, 3, 5],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '13',
      dataIndexes: [0, 7, 14, 21, 28, 35, 42],
      dataOffsets: [0, 2, 3, 5],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '12+',
      dataIndexes: [0, 6, 12, 18, 24, 30],
      dataOffsets: [0, 1, 2, 4],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '12+',
      dataIndexes: [36],
      dataOffsets: [0, 2, 3, 5],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '12',
      dataIndexes: [0, 7, 14, 21, 27, 34, 41],
      dataOffsets: [0, 1, 2, 4],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '12',
      dataIndexes: [48],
      dataOffsets: [0, 2, 3, 5],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: 'Tmai',
      dataIndexes: [0],
      dataOffsets: [1, 2, 3, 7],
    }),
  ];
}

async function fetchSheetsV8() {
  const spreadsheet = new GoogleSpreadsheet('1xqXfzfDfxiEE9mREwgX_ITIY8AowRM7w-TH2t1I_RJE');
  spreadsheet.useApiKey(process.env.GOOGLE_API_KEY!);
  await spreadsheet.loadInfo();

  return [
    ...await extractRecords({
      spreadsheet,
      sheetName: 'FESTiVAL+新曲',
      dataIndexes: [0, 6, 12, 18, 24],
      dataOffsets: [0, 1, 2, 4],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '14以上',
      dataIndexes: [0, 7, 14, 21],
      dataOffsets: [0, 2, 3, 5],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '13+',
      dataIndexes: [0, 7, 14, 21],
      dataOffsets: [0, 2, 3, 5],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '13',
      dataIndexes: [0, 7, 14, 21, 28, 35],
      dataOffsets: [0, 2, 3, 5],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '12+',
      dataIndexes: [0, 7, 13, 19, 25, 31],
      dataOffsets: [0, 1, 2, 4],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '12+',
      dataIndexes: [37],
      dataOffsets: [0, 2, 3, 5],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '12',
      dataIndexes: [0, 7, 14, 21, 28, 35, 42],
      dataOffsets: [0, 1, 2, 4],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '12',
      dataIndexes: [49],
      dataOffsets: [0, 2, 3, 5],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: 'Tmai',
      dataIndexes: [0],
      dataOffsets: [1, 2, 3, 7],
    }),
  ];
}

async function fetchSheetsV9() {
  const spreadsheet = new GoogleSpreadsheet('1vSqx2ghJKjWwCLrDEyZTUMSy5wkq_gY4i0GrJgSreQc');
  spreadsheet.useApiKey(process.env.GOOGLE_API_KEY!);
  await spreadsheet.loadInfo();

  return [
    ...await extractRecords({
      spreadsheet,
      sheetName: 'BUDDiES新曲',
      dataIndexes: [0, 6, 12, 18, 24],
      dataOffsets: [0, 1, 2, 4],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '14以上',
      dataIndexes: [0, 7, 14, 21, 28, 35],
      dataOffsets: [0, 2, 3, 5],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '13+',
      dataIndexes: [0, 7, 14, 21],
      dataOffsets: [0, 2, 3, 5],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '13',
      dataIndexes: [0, 7, 14, 21, 28, 35, 42],
      dataOffsets: [0, 2, 3, 5],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '12+',
      dataIndexes: [0, 6, 12, 19, 26, 33],
      dataOffsets: [0, 1, 2, 4],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '12+',
      dataIndexes: [39],
      dataOffsets: [0, 2, 3, 5],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '12',
      dataIndexes: [0, 6, 13, 19, 26, 32],
      dataOffsets: [0, 1, 2, 4],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '12',
      dataIndexes: [38],
      dataOffsets: [0, 2, 3, 5],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: 'Tmai',
      dataIndexes: [0],
      dataOffsets: [1, 2, 3, 7],
    }),
  ];
}

async function fetchSheetsV10() {
  const spreadsheet = new GoogleSpreadsheet('1d1AjO92Hj-iay10MsqdR_5TswEaikzC988aEOtFyybo');
  spreadsheet.useApiKey(process.env.GOOGLE_API_KEY!);
  await spreadsheet.loadInfo();

  return [
    ...await extractRecords({
      spreadsheet,
      sheetName: 'BUDDiES+新曲',
      dataIndexes: [0, 6, 12, 18, 24],
      dataOffsets: [0, 1, 2, 4],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '14以上',
      dataIndexes: [0, 7, 15, 22, 29, 37],
      dataOffsets: [0, 2, 3, 5],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '13+',
      dataIndexes: [0, 8, 15, 22, 29],
      dataOffsets: [0, 2, 3, 5],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '13',
      dataIndexes: [0, 8, 16, 23, 30, 37, 45],
      dataOffsets: [0, 2, 3, 5],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '12+',
      dataIndexes: [0, 7, 14, 20, 27],
      dataOffsets: [0, 1, 2, 4],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '12+',
      dataIndexes: [34],
      dataOffsets: [0, 2, 3, 5],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '12',
      dataIndexes: [0, 7, 14, 21, 28, 35],
      dataOffsets: [0, 1, 2, 4],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '12',
      dataIndexes: [42],
      dataOffsets: [0, 2, 3, 5],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: 'Tmai',
      dataIndexes: [0],
      dataOffsets: [1, 2, 3, 7],
    }),
  ];
}

async function fetchSheetsV11() {
  const spreadsheet = new GoogleSpreadsheet('1DKssDl2MM-jjK_GmHPEIVcOMcpVzaeiXA9P5hmhDqAo');
  spreadsheet.useApiKey(process.env.GOOGLE_API_KEY!);
  await spreadsheet.loadInfo();

  return [
    ...await extractRecords({
      spreadsheet,
      sheetName: 'PRiSM新曲',
      dataIndexes: [0, 6, 12, 18, 24],
      dataOffsets: [0, 1, 2, 4],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '14以上',
      dataIndexes: [0, 7, 14, 21, 28],
      dataOffsets: [0, 2, 3, 5],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '13+',
      dataIndexes: [0, 7, 14, 21],
      dataOffsets: [0, 2, 3, 5],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '13',
      dataIndexes: [0, 8, 15, 22, 29, 36],
      dataOffsets: [0, 2, 3, 5],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '12+',
      dataIndexes: [0, 6, 12, 18, 24],
      dataOffsets: [0, 1, 2, 4],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '12',
      dataIndexes: [0, 7, 14, 22, 29, 36],
      dataOffsets: [0, 1, 2, 4],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: 'Tmai',
      dataIndexes: [0],
      dataOffsets: [1, 2, 3, 7],
    }),
  ];
}

async function fetchSheetsV12() {
  const spreadsheet = new GoogleSpreadsheet('10N6jmyrzmHrZGbGhDWfpdg4hQKm0t84H2DPkaFG7PNs');
  spreadsheet.useApiKey(process.env.GOOGLE_API_KEY!);
  await spreadsheet.loadInfo();

  return [
    ...await extractRecords({
      spreadsheet,
      sheetName: 'PRiSM PLUS新曲',
      dataIndexes: [0, 6, 12, 18, 24],
      dataOffsets: [0, 1, 2, 4],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '14以上',
      dataIndexes: [0, 7, 14, 21, 28],
      dataOffsets: [0, 2, 3, 5],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '13+',
      dataIndexes: [0, 6, 12, 18],
      dataOffsets: [0, 1, 2, 4],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '13',
      dataIndexes: [0, 6, 12, 18, 24, 30],
      dataOffsets: [0, 1, 2, 4],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '12+',
      dataIndexes: [0, 6, 12, 18],
      dataOffsets: [0, 1, 2, 4],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '12',
      dataIndexes: [0, 6, 12, 18, 24, 30],
      dataOffsets: [0, 1, 2, 4],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: 'Tmai',
      dataIndexes: [0],
      dataOffsets: [1, 2, 3, 7],
    }),
  ];
}

async function fetchSheetsV13() {
  const spreadsheet = new GoogleSpreadsheet('17vd35oIHxjXPUU-6QJwYoTLPs2nneHN4hokMNLoQQLY');
  spreadsheet.useApiKey(process.env.GOOGLE_API_KEY!);
  await spreadsheet.loadInfo();

  return [
    ...await extractRecords({
      spreadsheet,
      sheetName: 'CiRCLE新曲',
      dataIndexes: [0, 6, 12, 18, 24],
      dataOffsets: [0, 1, 2, 4],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: 'PRiSM PLUS新曲',
      dataIndexes: [0, 6, 12, 18, 24],
      dataOffsets: [0, 1, 2, 4],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '新曲枠',
      dataIndexes: [0, 7, 14, 21],
      dataOffsets: [0, 2, 3, 5],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '14以上',
      dataIndexes: [0, 7, 14, 21, 28],
      dataOffsets: [0, 2, 3, 5],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '13+',
      dataIndexes: [0, 6, 12, 18],
      dataOffsets: [0, 1, 2, 4],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '13',
      dataIndexes: [0, 6, 12, 18, 24, 30],
      dataOffsets: [0, 1, 2, 4],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '12+',
      dataIndexes: [0, 6, 12, 18],
      dataOffsets: [0, 1, 2, 4],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: '12',
      dataIndexes: [0, 6, 12, 18, 24, 30],
      dataOffsets: [0, 1, 2, 4],
    }),
    ...await extractRecords({
      spreadsheet,
      sheetName: 'Tmai',
      dataIndexes: [0],
      dataOffsets: [1, 2, 3, 7],
    }),
  ];
}

export default async function run() {
  if (!process.env.GOOGLE_API_KEY) {
    throw new Error('Please set your GOOGLE_API_KEY in the .env file');
  }

  logger.info('Fetching data from internal level source ...');
  const rawSheets = [
    // ...await fetchSheetsV6(),
    // ...await fetchSheetsV7(),
    // ...await fetchSheetsV8(),
    // ...await fetchSheetsV9(),
    // ...await fetchSheetsV10(),
    // ...await fetchSheetsV11(),
    // ...await fetchSheetsV12(),
    ...await fetchSheetsV13(),
  ];
  logger.info(`OK, ${rawSheets.length} sheets fetched.`);

  const sheets = rawSheets
    .map((rawSheet) => extractSheet(rawSheet))
    .filter((sheet) => sheet.songId !== undefined);

  logger.info('Updating sheetInternalLevels ...');
  await Promise.all(sheets.map((sheet) => SheetInternalLevel.upsert(sheet)));

  logger.info('Checking unmatched songIds ...');
  checkUnmatchedEntries(
    (await SheetInternalLevel.findAll<any>()).map((sheet) => sheet.songId),
    (await Song.findAll<any>()).map((song) => song.songId),
  );

  logger.info('Done!');
}

if (require.main === module) run();

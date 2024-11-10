import fs from 'node:fs';
import crypto from 'node:crypto';
import { parse as parseCsv } from 'csv/sync';
import { rawDataSchema } from './schemas';

export function hashed(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export function concatOrCoalesceString(a: string | null, b: string | null): string | null {
  if (a != null && b != null) return [a, b].join('|');
  return a ?? b;
}

export function chunkBy<T>(arr: T[], chunkSize: number): T[][] {
  const chunkCount = Math.ceil(arr.length / chunkSize);

  return [...Array(chunkCount).keys()].map(
    (index) => arr.slice(
      chunkSize * index,
      chunkSize * (index + 1),
    ),
  );
}

export function getSheetSorter({
  types,
  difficulties,
}: {
  types: Record<string, any>[],
  difficulties: Record<string, any>[],
}) {
  const typeOrder = new Map(types.map(
    ({ type }, index) => [type, index],
  ));
  const difficultyOrder = new Map(difficulties.map(
    ({ difficulty }, index) => [difficulty, index],
  ));

  return {
    sorted(sheets: Record<string, any>[]) {
      return sheets.slice().sort((a, b) => (
        0
        || typeOrder.get(a.type)! - typeOrder.get(b.type)!
        || difficultyOrder.get(a.difficulty)! - difficultyOrder.get(b.difficulty)!
      ));
    },
  };
}

export function ensureNoDuplicateEntry(entries: any[]) {
  const entrySet = new Set<any>();
  const duplicateEntrySet = new Set<any>();

  for (const entry of entries) {
    if (entrySet.has(entry)) duplicateEntrySet.add(entry);
    entrySet.add(entry);
  }

  if (duplicateEntrySet.size > 0) {
    console.error([...duplicateEntrySet]);
    throw new Error('! Duplicate entries detected');
  }
}

export function checkUnmatchedEntries(entries: any[], validEntries: any[]) {
  const validEntrySet = new Set<any>(validEntries);
  const unmatchedEntrySet = new Set<any>();

  for (const entry of entries) {
    if (!validEntrySet.has(entry)) unmatchedEntrySet.add(entry);
  }

  if (unmatchedEntrySet.size > 0) {
    console.warn('! Unmatched entries detected:', [...unmatchedEntrySet]);
  }
}

export function loadCsv(filePath: string) {
  if (!fs.existsSync(filePath)) return undefined;
  const rawTsv = fs.readFileSync(filePath, 'utf8');
  return parseCsv(rawTsv, { delimiter: ',', columns: true });
}

export function loadTsv(filePath: string) {
  if (!fs.existsSync(filePath)) return undefined;
  const rawTsv = fs.readFileSync(filePath, 'utf8');
  return parseCsv(rawTsv, { delimiter: '\t', columns: true });
}

export function fc2WikiTitleEscape(title: string) {
  return title
    .replaceAll('+', '＋')
    .replaceAll('[', '［')
    .replaceAll(']', '］')
    .replaceAll('#', '＃')
    .replaceAll('&', '＆')
    .replaceAll('?', '？')
    .replaceAll('>', '＞')
    .replaceAll(':', '：');
}

export function gamerchWikiTitleEscape(title: string) {
  return title
    .replaceAll('<', '＜')
    .replaceAll('>', '＞')
    .replaceAll('"', '”')
    .replaceAll('{', '｛')
    .replaceAll('}', '｝')
    .replaceAll('|', '｜')
    .replaceAll('\\', '＼')
    .replaceAll('^', '︿')
    .replaceAll('[', '［')
    .replaceAll(']', '］')
    .replaceAll('`', '‵')
    .replaceAll('#', '＃')
    .replaceAll('/', '／')
    .replaceAll('?', '？')
    .replaceAll(':', '：')
    .replaceAll('@', '＠')
    .replaceAll('&', '＆')
    .replaceAll('=', '＝')
    .replaceAll('+', '＋')
    .replaceAll('$', '＄')
    .replaceAll(',', '，')
    .replaceAll("'", '’')
    .replaceAll('(', '（')
    .replaceAll(')', '）')
    .replaceAll('!', '！')
    .replaceAll('*', '＊');
}

export function gamerchWikiV2TitleEscape(title: string) {
  return title
    .replaceAll('<', '＜')
    .replaceAll('>', '＞')
    .replaceAll('"', '”')
    .replaceAll('{', '｛')
    .replaceAll('}', '｝')
    .replaceAll('|', '｜')
    .replaceAll('^', '︿')
    .replaceAll('[', '［')
    .replaceAll(']', '］')
    .replaceAll('`', '‵')
    .replaceAll('#', '＃')
    .replaceAll('%', '％')
    .replaceAll('/', '／')
    .replaceAll('?', '？')
    .replaceAll("'", '’')
    .replaceAll('(', '（')
    .replaceAll(')', '）')
    .replaceAll('\\', '＼');
}

export function wikiwikiWikiTitleEscape(title: string) {
  return title
    .replaceAll('"', '”')
    .replaceAll('#', '＃')
    .replaceAll('&', '＆')
    .replaceAll('<', '＜')
    .replaceAll('>', '＞')
    .replaceAll('[', '［')
    .replaceAll(']', '］')
    .replaceAll(':', '：');
}

export function makeOutput(output: unknown) {
  return rawDataSchema.parse(output);
}

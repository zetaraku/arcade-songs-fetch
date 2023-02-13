import fs from 'node:fs';
import crypto from 'node:crypto';
import { parse as parseCsv } from 'csv/sync';

export function hashed(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
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

  for (const entry of entries) {
    if (entrySet.has(entry)) throw new Error(`! Duplicate entry detected: ${entry}`);
    entrySet.add(entry);
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

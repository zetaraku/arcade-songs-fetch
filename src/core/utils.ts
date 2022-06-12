import crypto from 'crypto';

export function hashed(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export function getSheetSorter({
  typeMappingList,
  difficultyMappingList,
}: {
  typeMappingList: Record<string, any>[],
  difficultyMappingList: Record<string, any>[],
}) {
  const typeOrder = new Map(typeMappingList.map(
    ({ type }, index) => [type, index],
  ));
  const difficultyOrder = new Map(difficultyMappingList.map(
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

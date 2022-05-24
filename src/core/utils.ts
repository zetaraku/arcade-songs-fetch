import crypto from 'crypto';
import log4js from 'log4js';

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

export function checkDuplicatedTitle(songs: Record<string, any>[], logger: log4js.Logger) {
  const titles = new Set<string>();
  const duplicateTitles = new Set<string>();

  logger.info('Checking songs with duplicated title ...');
  for (const song of songs) {
    if (titles.has(song.title)) {
      duplicateTitles.add(song.title);
    }
    titles.add(song.title);
  }

  if (duplicateTitles.size > 0) {
    logger.warn('! Found duplicated titles:', [...duplicateTitles]);
  }
}

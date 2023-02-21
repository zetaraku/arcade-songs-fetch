import { getSheetSorter } from '@/_core/utils';

function defaultGetInternalLevelValueOf(sheet: Record<string, any>) {
  if (sheet.internalLevel === undefined) return undefined;
  if (sheet.internalLevel === null) return null;
  return Number(sheet.internalLevel.replace('?', ''));
}

export default async function run({
  songRecords,
  sheetRecords,
  categories,
  versions,
  types,
  difficulties,
  regions,
  updateTime = new Date(),
  getLevelValueOf,
  getInternalLevelValueOf = defaultGetInternalLevelValueOf,
  getIsSpecialOf,
}: {
  songRecords: Record<string, any>[],
  sheetRecords: Record<string, any>[],
  categories: Record<string, any>[],
  versions: Record<string, any>[],
  types: Record<string, any>[],
  difficulties: Record<string, any>[],
  regions: Record<string, any>[],
  updateTime?: Date,
  getLevelValueOf: (sheet: any) => number | null,
  getInternalLevelValueOf?: (sheet: any) => number | null | undefined,
  getIsSpecialOf: (sheet: any) => boolean | null,
}) {
  const getSortedSheetsOf = getSheetSorter(
    { types, difficulties },
  ).sorted;

  const songs = songRecords.map((song) => ({
    songId: song.songId,

    category: song.category,
    title: song.title,
    artist: song.artist,
    bpm: song.bpm,

    imageName: song.imageName,

    version: (
      song.version ?? (
        song.releaseDate !== null ? versions.find(
          ({ dateBefore }) => dateBefore === null || song.releaseDate < dateBefore,
        )?.version : null
      ) ?? null
    ),
    releaseDate: song.releaseDate,

    isNew: song.isNew != null ? Boolean(song.isNew) : undefined,
    isLocked: song.isLocked != null ? Boolean(song.isLocked) : undefined,

    sheets: getSortedSheetsOf(
      sheetRecords
        .filter((sheet) => sheet.songId === song.songId)
        .map((sheet) => ({
          type: sheet.type,
          difficulty: sheet.difficulty,

          level: sheet.level,
          levelValue: getLevelValueOf(sheet),

          internalLevel: sheet.internalLevel,
          internalLevelValue: getInternalLevelValueOf(sheet),

          noteDesigner: sheet.noteDesigner,
          noteCounts: sheet.noteCounts ?? undefined,

          regions: sheet.regions != null ? Object.fromEntries(
            [...Object.entries(sheet.regions)].map(
              ([region, value]) => [region, Boolean(value)],
            ),
          ) : undefined,

          isSpecial: getIsSpecialOf(sheet) || undefined,

          version: sheet.version ?? undefined,
        })),
    ),
  }));

  versions.forEach((e) => {
    delete e.dateBefore;
  });

  const output = {
    songs,
    categories,
    versions,
    types,
    difficulties,
    regions,
    updateTime: updateTime.toISOString(),
  };

  return JSON.stringify(output, null, '\t');
}

import { z } from 'zod';

export const rawSheetSchema = z.object({
  type: z.string(),
  difficulty: z.string(),

  level: z.string().nullable(),
  levelValue: z.number().nullable(),

  internalLevel: z.string().nullable().optional(),
  internalLevelValue: z.number().nullable().optional(),

  noteDesigner: z.string().nullable(),

  noteCounts: z.record(
    z.string().or(z.literal('total')),
    z.number().nullable(),
  ).optional(),

  regions: z.record(
    z.string(),
    z.boolean(),
  ).optional(),

  isSpecial: z.boolean().nullable(),

  // optional sheet overrides
  version: z.string().nullable().optional(),
}).strict();

export const rawSongSchema = z.object({
  songId: z.string(),

  category: z.string().nullable(),
  title: z.string(),
  artist: z.string().nullable(),
  bpm: z.number().nullable(),

  imageName: z.string().nullable(),

  version: z.string().nullable(),
  releaseDate: z.string().nullable(),

  isNew: z.boolean().nullable(),
  isLocked: z.boolean().nullable(),

  sheets: z.array(rawSheetSchema),
}).strict();

export const rawDataSchema = z.object({
  songs: z.array(rawSongSchema),

  categories: z.array(z.object({
    category: z.string().nullable(),
    abbr: z.string().optional(),
  }).strict()),

  versions: z.array(z.object({
    version: z.string().nullable(),
    abbr: z.string().optional(),
  }).strict()),

  types: z.array(z.object({
    type: z.string(),
    name: z.string(),
    abbr: z.string().optional(),
    iconUrl: z.string().optional(),
    iconHeight: z.number().optional(),
  }).strict()),

  difficulties: z.array(z.object({
    difficulty: z.string(),
    name: z.string(),
    abbr: z.string().optional(),
    color: z.string().optional(),
    iconUrl: z.string().optional(),
    iconHeight: z.number().optional(),
  }).strict()),

  regions: z.array(z.object({
    region: z.string(),
    name: z.string(),
  }).strict()),

  updateTime: z.string().datetime(),
}).strict();

export type RawSheet = z.infer<typeof rawSheetSchema>;
export type RawSong = z.infer<typeof rawSongSchema>;
export type RawData = z.infer<typeof rawDataSchema>;

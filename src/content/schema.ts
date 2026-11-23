import { z } from 'zod'

export const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/

const videoId = z.string().regex(VIDEO_ID_RE)
const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
const text = z.string().min(1)
const count = z.int().nonnegative()

export const VideoSchema = z.strictObject({
  id: videoId,
  title: text,
  // null finché mancano i metadati del singolo video (sempre per gli Shorts)
  publishedAt: z.iso.date().nullable(),
  durationSec: count.nullable(),
  kind: z.enum(['tutorial', 'short']),
  playlists: z.array(text),
  hasTranscript: z.boolean(),
})

export const ModuleSchema = z.strictObject({
  id: slug,
  title: text,
  description: text,
  order: z.int(),
})

export const EXCLUSION_REASONS = ['vlog', 'annuncio', 'promo', 'non-didattico', 'senza-trascrizione'] as const

export const AssignmentsSchema = z.record(
  videoId,
  z.union([
    z.strictObject({ module: slug }),
    z.strictObject({ exclude: z.enum(EXCLUSION_REASONS), note: text.optional() }),
  ]),
)

const VideoRefSchema = z.strictObject({
  videoId,
  startSec: count.optional(),
  label: text.optional(),
})

const StepSchema = z
  .strictObject({
    text,
    videoId: videoId.optional(),
    startSec: count.optional(),
  })
  .refine((step) => step.startSec === undefined || step.videoId !== undefined, {
    message: 'startSec richiede videoId',
  })

export const LessonSchema = z.strictObject({
  id: slug,
  moduleId: slug,
  title: text,
  summary: text,
  goal: text,
  prerequisites: z.array(slug),
  equipment: z.array(text),
  sessionMinutes: z.int().min(1).max(60),
  steps: z.array(StepSchema).min(3).max(8),
  criteria: text,
  mistakes: z.array(text),
  safetyNote: text.optional(),
  videos: z.array(VideoRefSchema).min(1),
  // Bozza non ancora verificata sulla trascrizione: mostrata come tale e non contata nella copertura
  draft: z.boolean().optional(),
})

export const PathSchema = z.strictObject({
  stages: z
    .array(
      z.strictObject({
        id: slug,
        title: text,
        description: text,
        kind: z.enum(['core', 'extra']),
        lessonIds: z.array(slug),
      }),
    )
    .min(1),
})

export const LESSON_STATUSES = ['todo', 'in-progress', 'mastered', 'known'] as const

export const LessonProgressSchema = z.strictObject({
  status: z.enum(LESSON_STATUSES),
  checkedSteps: z.array(count),
})

export const DiaryEntrySchema = z.strictObject({
  id: text,
  date: z.iso.date(),
  lessonId: slug.optional(),
  minutes: z.int().min(1).max(600).optional(),
  rating: z.int().min(1).max(5).optional(),
  notes: z.string().max(4000),
  createdAt: z.iso.datetime(),
})

export const SettingsSchema = z.strictObject({
  dogName: z.string().max(40),
})

export const BackupSchema = z.strictObject({
  version: z.literal(1),
  exportedAt: z.iso.datetime(),
  progress: z.record(slug, LessonProgressSchema),
  diary: z.array(DiaryEntrySchema),
  settings: SettingsSchema,
})

export type Video = z.infer<typeof VideoSchema>
export type Module = z.infer<typeof ModuleSchema>
export type Assignments = z.infer<typeof AssignmentsSchema>
export type Lesson = z.infer<typeof LessonSchema>
export type Path = z.infer<typeof PathSchema>
export type Stage = Path['stages'][number]
export type LessonStatus = (typeof LESSON_STATUSES)[number]
export type LessonProgress = z.infer<typeof LessonProgressSchema>
export type DiaryEntry = z.infer<typeof DiaryEntrySchema>
export type Settings = z.infer<typeof SettingsSchema>
export type Backup = z.infer<typeof BackupSchema>

import { z } from 'zod'
import {
  AssignmentsSchema,
  LessonSchema,
  ModuleSchema,
  PathSchema,
  VideoSchema,
  type Assignments,
  type Lesson,
  type Module,
  type Path,
  type Video,
} from '../../src/content/schema.ts'

export type RawContent = {
  videos: unknown
  modules: unknown
  path: unknown
  assignments: unknown
  // file: percorso relativo a content/lessons, es. "calma/tappetino.json"
  lessonFiles: { file: string; json: unknown }[]
}

export type Content = {
  videos: Video[]
  modules: Module[]
  path: Path
  assignments: Assignments
  lessons: Lesson[]
}

export function checkContent(raw: RawContent): { errors: string[]; content: Content | null } {
  const errors: string[] = []

  function parse<T>(schema: z.ZodType<T>, value: unknown, label: string): T | null {
    const result = schema.safeParse(value)
    if (result.success) return result.data
    errors.push(`${label}:\n${z.prettifyError(result.error)}`)
    return null
  }

  const videos = parse(z.array(VideoSchema), raw.videos, 'catalog/videos.json')
  const modules = parse(z.array(ModuleSchema), raw.modules, 'modules.json')
  const path = parse(PathSchema, raw.path, 'path.json')
  const assignments = parse(AssignmentsSchema, raw.assignments, 'catalog/assignments.json')
  const lessons: Lesson[] = []
  for (const { file, json } of raw.lessonFiles) {
    const lesson = parse(LessonSchema, json, `lessons/${file}`)
    if (!lesson) continue
    const expected = `${lesson.moduleId}/${lesson.id}.json`
    if (file !== expected) errors.push(`lessons/${file}: il percorso del file deve essere ${expected}`)
    lessons.push(lesson)
  }
  if (!videos || !modules || !path || !assignments) return { errors, content: null }

  const duplicates = (ids: string[]) => new Set(ids.filter((id, index) => ids.indexOf(id) !== index))
  for (const id of duplicates(videos.map((v) => v.id))) errors.push(`catalog/videos.json: id duplicato ${id}`)
  for (const id of duplicates(modules.map((m) => m.id))) errors.push(`modules.json: id duplicato ${id}`)
  for (const id of duplicates(path.stages.map((s) => s.id))) errors.push(`path.json: tappa duplicata ${id}`)
  for (const id of duplicates(lessons.map((l) => l.id))) errors.push(`lessons: id duplicato ${id}`)

  const videoById = new Map(videos.map((v) => [v.id, v]))
  const moduleIds = new Set(modules.map((m) => m.id))
  const lessonById = new Map(lessons.map((l) => [l.id, l]))

  const stageCount = new Map<string, number>()
  for (const stage of path.stages) {
    for (const id of stage.lessonIds) {
      if (!lessonById.has(id)) errors.push(`path.json: la tappa ${stage.id} cita la lezione inesistente ${id}`)
      stageCount.set(id, (stageCount.get(id) ?? 0) + 1)
    }
  }
  const coreLessonIds = new Set(path.stages.filter((s) => s.kind === 'core').flatMap((s) => s.lessonIds))

  for (const lesson of lessons) {
    const where = `lessons/${lesson.moduleId}/${lesson.id}.json`
    if (!moduleIds.has(lesson.moduleId)) errors.push(`${where}: modulo inesistente ${lesson.moduleId}`)
    if (stageCount.get(lesson.id) !== 1) {
      errors.push(`${where}: deve comparire in una sola tappa di path.json (trovate: ${stageCount.get(lesson.id) ?? 0})`)
    }

    for (const id of lesson.prerequisites) {
      if (id === lesson.id || !lessonById.has(id)) errors.push(`${where}: prerequisito non valido ${id}`)
      // Altrimenti il percorso core resterebbe bloccato in attesa di una lezione extra
      else if (coreLessonIds.has(lesson.id) && !coreLessonIds.has(id)) {
        errors.push(`${where}: lezione core con prerequisito fuori dal percorso core (${id})`)
      }
    }

    const ownVideoIds = new Set(lesson.videos.map((v) => v.videoId))
    if (ownVideoIds.size !== lesson.videos.length) errors.push(`${where}: video ripetuto in videos`)
    for (const ref of [...lesson.videos, ...lesson.steps]) {
      if (ref.videoId === undefined) continue
      const video = videoById.get(ref.videoId)
      if (!ownVideoIds.has(ref.videoId)) errors.push(`${where}: un passo cita ${ref.videoId}, assente da videos`)
      if (video?.kind !== 'tutorial') errors.push(`${where}: ${ref.videoId} non è un tutorial del catalogo`)
      else if (ref.startSec !== undefined && video.durationSec !== null && ref.startSec >= video.durationSec) {
        errors.push(`${where}: startSec ${ref.startSec} oltre la durata di ${ref.videoId} (${video.durationSec} s)`)
      }
    }
  }

  const visitState = new Map<string, 'visiting' | 'done'>()
  function visit(id: string, trail: string[]): void {
    if (visitState.get(id) === 'done') return
    if (visitState.get(id) === 'visiting') {
      errors.push(`lessons: ciclo nei prerequisiti: ${[...trail.slice(trail.indexOf(id)), id].join(' -> ')}`)
      return
    }
    visitState.set(id, 'visiting')
    for (const prerequisite of lessonById.get(id)?.prerequisites ?? []) visit(prerequisite, [...trail, id])
    visitState.set(id, 'done')
  }
  for (const lesson of lessons) visit(lesson.id, [])

  const citedVideoIds = new Set(lessons.flatMap((l) => l.videos.map((v) => v.videoId)))
  for (const [videoId, assignment] of Object.entries(assignments)) {
    if (videoById.get(videoId)?.kind !== 'tutorial') {
      errors.push(`catalog/assignments.json: ${videoId} non è un tutorial del catalogo`)
    }
    if ('module' in assignment) {
      if (!moduleIds.has(assignment.module)) {
        errors.push(`catalog/assignments.json: ${videoId} assegnato al modulo inesistente ${assignment.module}`)
      }
    } else if (citedVideoIds.has(videoId)) {
      errors.push(`catalog/assignments.json: ${videoId} è escluso ma citato da una lezione`)
    }
  }

  return { errors: [...new Set(errors)], content: { videos, modules, path, assignments, lessons } }
}

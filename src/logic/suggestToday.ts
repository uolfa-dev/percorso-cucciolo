import type { DiaryEntry, Lesson, LessonStatus, Path } from '../content/schema.ts'
import { isDone, lastPracticed, statusOf, type ProgressMap } from './progress.ts'

export type Suggestion = {
  lessonId: string
  reason: 'in-progress' | 'new' | 'review'
}

const MAX_IN_PROGRESS = 2
const MAX_BEFORE_REVIEW = 3

export function suggestToday(input: {
  path: Path
  lessons: ReadonlyMap<string, Lesson>
  progress: ProgressMap
  diary: DiaryEntry[]
}): Suggestion[] {
  const { path, lessons, progress, diary } = input
  const idsOf = (kind: 'core' | 'extra') =>
    path.stages
      .filter((stage) => stage.kind === kind)
      .flatMap((stage) => stage.lessonIds)
      .filter((id) => lessons.has(id))
  const core = idsOf('core')
  const ordered = [...core, ...idsOf('extra')]
  const withStatus = (status: LessonStatus) => ordered.filter((id) => statusOf(progress, id) === status)

  const last = lastPracticed(diary)
  // Ordinamento stabile: a parità di ultima sessione vale l'ordine del percorso
  const leastRecentFirst = (ids: string[]) =>
    ids.toSorted((a, b) => {
      const [keyA, keyB] = [last.get(a) ?? '', last.get(b) ?? '']
      return keyA < keyB ? -1 : keyA > keyB ? 1 : 0
    })

  const suggestions: Suggestion[] = leastRecentFirst(withStatus('in-progress'))
    .slice(0, MAX_IN_PROGRESS)
    .map((lessonId) => ({ lessonId, reason: 'in-progress' }))

  const coreFinished = core.every((id) => statusOf(progress, id) !== 'todo')
  for (const lessonId of coreFinished ? ordered : core) {
    if (suggestions.length >= MAX_BEFORE_REVIEW) break
    const unlocked = lessons.get(lessonId)?.prerequisites.every((id) => isDone(statusOf(progress, id)))
    if (statusOf(progress, lessonId) === 'todo' && unlocked) suggestions.push({ lessonId, reason: 'new' })
  }

  const [review] = leastRecentFirst(withStatus('mastered'))
  if (review) suggestions.push({ lessonId: review, reason: 'review' })

  return suggestions
}

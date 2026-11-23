import type { DiaryEntry, LessonProgress, LessonStatus, Stage } from '../content/schema.ts'

export type ProgressMap = Record<string, LessonProgress>

export const STATUS_LABELS: Record<LessonStatus, string> = {
  todo: 'Da iniziare',
  'in-progress': 'In corso',
  mastered: 'Acquisita',
  known: 'La sa già',
}

export function statusOf(progress: ProgressMap, lessonId: string): LessonStatus {
  return progress[lessonId]?.status ?? 'todo'
}

export function isDone(status: LessonStatus): boolean {
  return status === 'mastered' || status === 'known'
}

export function stageStats(stage: Stage, progress: ProgressMap): { total: number; done: number } {
  return {
    total: stage.lessonIds.length,
    done: stage.lessonIds.filter((id) => isDone(statusOf(progress, id))).length,
  }
}

// Per ogni lezione, chiave ordinabile dell'ultima sessione registrata
export function lastPracticed(diary: DiaryEntry[]): Map<string, string> {
  const last = new Map<string, string>()
  for (const entry of diary) {
    if (!entry.lessonId) continue
    const key = `${entry.date} ${entry.createdAt}`
    if (key > (last.get(entry.lessonId) ?? '')) last.set(entry.lessonId, key)
  }
  return last
}

function mondayOf(isoDate: string): Date {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7))
  return date
}

// Settimana da lunedì a domenica che contiene `today` (YYYY-MM-DD)
export function weekStats(diary: DiaryEntry[], today: string): { sessions: number; minutes: number } {
  const monday = mondayOf(today)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  const [start, end] = [monday, sunday].map((date) => date.toISOString().slice(0, 10))
  const entries = diary.filter((entry) => entry.date >= start && entry.date <= end)
  return {
    sessions: entries.length,
    minutes: entries.reduce((sum, entry) => sum + (entry.minutes ?? 0), 0),
  }
}

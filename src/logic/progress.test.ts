import { describe, expect, it } from 'vitest'
import type { DiaryEntry } from '../content/schema.ts'
import { lastPracticed, stageStats, weekStats } from './progress.ts'

function entry(date: string, extra: Partial<DiaryEntry> = {}): DiaryEntry {
  return { id: `${date}-${extra.createdAt ?? ''}`, date, notes: '', createdAt: `${date}T10:00:00.000Z`, ...extra }
}

describe('weekStats', () => {
  // Lunedì 16 - domenica 22 novembre 2026
  const diary = [
    entry('2026-11-15', { minutes: 99 }),
    entry('2026-11-16', { minutes: 5 }),
    entry('2026-11-19'),
    entry('2026-11-22', { minutes: 10 }),
    entry('2026-11-23', { minutes: 99 }),
  ]

  it('conta sessioni e minuti dal lunedì alla domenica', () => {
    expect(weekStats(diary, '2026-11-18')).toEqual({ sessions: 3, minutes: 15 })
    expect(weekStats(diary, '2026-11-16')).toEqual({ sessions: 3, minutes: 15 })
    expect(weekStats(diary, '2026-11-22')).toEqual({ sessions: 3, minutes: 15 })
    expect(weekStats(diary, '2026-11-23')).toEqual({ sessions: 1, minutes: 99 })
  })

  it('funziona a cavallo di mese e anno', () => {
    expect(weekStats([entry('2026-12-28', { minutes: 3 }), entry('2027-01-03', { minutes: 4 })], '2027-01-01')).toEqual({
      sessions: 2,
      minutes: 7,
    })
  })
})

describe('lastPracticed', () => {
  it('tiene l\'ultima sessione di ogni lezione e ignora le voci senza lezione', () => {
    const last = lastPracticed([
      entry('2026-11-10', { lessonId: 'a' }),
      entry('2026-11-12', { lessonId: 'a', createdAt: '2026-11-12T08:00:00.000Z' }),
      entry('2026-11-12', { lessonId: 'a', createdAt: '2026-11-12T18:00:00.000Z' }),
      entry('2026-11-11', { lessonId: 'b' }),
      entry('2026-11-20'),
    ])
    expect([...last]).toEqual([
      ['a', '2026-11-12 2026-11-12T18:00:00.000Z'],
      ['b', '2026-11-11 2026-11-11T10:00:00.000Z'],
    ])
  })
})

describe('stageStats', () => {
  it('conta come fatte le lezioni acquisite o già note', () => {
    const stage = { id: 'uno', title: 'Uno', description: 'Tappa', kind: 'core' as const, lessonIds: ['a', 'b', 'c', 'd'] }
    const progress = {
      a: { status: 'mastered' as const, checkedSteps: [] },
      b: { status: 'known' as const, checkedSteps: [] },
      c: { status: 'in-progress' as const, checkedSteps: [] },
    }
    expect(stageStats(stage, progress)).toEqual({ total: 4, done: 2 })
  })
})

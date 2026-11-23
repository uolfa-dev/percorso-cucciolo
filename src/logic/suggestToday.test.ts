import { describe, expect, it } from 'vitest'
import type { DiaryEntry, Lesson, LessonStatus, Path } from '../content/schema.ts'
import type { ProgressMap } from './progress.ts'
import { suggestToday } from './suggestToday.ts'

function lesson(id: string, prerequisites: string[] = []): Lesson {
  return {
    id,
    moduleId: 'calma',
    title: id,
    summary: 'Riassunto',
    goal: 'Obiettivo',
    prerequisites,
    equipment: [],
    sessionMinutes: 5,
    steps: [{ text: 'uno' }, { text: 'due' }, { text: 'tre' }],
    criteria: 'Criterio',
    mistakes: [],
    videos: [{ videoId: 'aaaaaaaaaa1' }],
  }
}

const path: Path = {
  stages: [
    { id: 'uno', title: 'Uno', description: 'Tappa', kind: 'core', lessonIds: ['a', 'b'] },
    { id: 'extra', title: 'Extra', description: 'Tappa', kind: 'extra', lessonIds: ['x', 'y'] },
    { id: 'due', title: 'Due', description: 'Tappa', kind: 'core', lessonIds: ['c', 'd', 'rimossa'] },
  ],
}

const lessons = new Map(
  [lesson('a'), lesson('b', ['a']), lesson('c'), lesson('d'), lesson('x'), lesson('y', ['x'])].map((l) => [l.id, l]),
)

function progressOf(statuses: Record<string, LessonStatus>): ProgressMap {
  return Object.fromEntries(Object.entries(statuses).map(([id, status]) => [id, { status, checkedSteps: [] }]))
}

function session(lessonId: string, date: string, createdAt = `${date}T10:00:00.000Z`): DiaryEntry {
  return { id: `${lessonId}-${createdAt}`, date, lessonId, notes: '', createdAt }
}

function suggest(statuses: Record<string, LessonStatus> = {}, diary: DiaryEntry[] = []) {
  return suggestToday({ path, lessons, progress: progressOf(statuses), diary }).map((s) => `${s.reason}:${s.lessonId}`)
}

describe('suggestToday', () => {
  it('all\'inizio propone le prime tre lezioni core sbloccate, nell\'ordine del percorso', () => {
    expect(suggest()).toEqual(['new:a', 'new:c', 'new:d'])
  })

  it('sblocca una lezione quando i prerequisiti sono acquisiti o già noti', () => {
    expect(suggest({ a: 'in-progress' })).toEqual(['in-progress:a', 'new:c', 'new:d'])
    expect(suggest({ a: 'known' })).toEqual(['new:b', 'new:c', 'new:d'])
    expect(suggest({ a: 'mastered' })).toEqual(['new:b', 'new:c', 'new:d', 'review:a'])
  })

  it('propone al massimo due lezioni in corso, la meno praticata di recente per prima', () => {
    const diary = [session('a', '2026-11-20'), session('c', '2026-11-18'), session('a', '2026-11-10')]
    expect(suggest({ a: 'in-progress', c: 'in-progress', d: 'in-progress' }, diary)).toEqual([
      'in-progress:d',
      'in-progress:c',
    ])
  })

  it('a parità di data usa l\'ora di registrazione, poi l\'ordine del percorso', () => {
    const diary = [session('c', '2026-11-20', '2026-11-20T08:00:00.000Z'), session('a', '2026-11-20', '2026-11-20T09:00:00.000Z')]
    expect(suggest({ a: 'in-progress', c: 'in-progress' }, diary)).toEqual(['in-progress:c', 'in-progress:a', 'new:d'])
    expect(suggest({ a: 'in-progress', c: 'in-progress' })).toEqual(['in-progress:a', 'in-progress:c', 'new:d'])
  })

  it('aggiunge un solo ripasso: la lezione acquisita meno praticata di recente, mai quelle già note', () => {
    const diary = [session('a', '2026-11-01'), session('c', '2026-11-15')]
    expect(suggest({ a: 'mastered', c: 'mastered', b: 'known', d: 'known' }, diary)).toEqual(['new:x', 'review:a'])
  })

  it('passa agli approfondimenti solo quando nel core non resta nulla da iniziare', () => {
    expect(suggest({ a: 'known', b: 'known', c: 'known' })).toEqual(['new:d'])
    expect(suggest({ a: 'known', b: 'known', c: 'known', d: 'in-progress' })).toEqual(['in-progress:d', 'new:x'])
    expect(suggest({ a: 'known', b: 'known', c: 'known', d: 'known', x: 'known' })).toEqual(['new:y'])
  })

  it('non propone mai più di quattro voci e ignora le lezioni non più presenti', () => {
    const all = suggest({ a: 'in-progress', c: 'in-progress', d: 'mastered', rimossa: 'in-progress' })
    expect(all).toEqual(['in-progress:a', 'in-progress:c', 'review:d'])
    expect(suggest({ a: 'mastered', c: 'in-progress', d: 'in-progress' })).toEqual([
      'in-progress:c',
      'in-progress:d',
      'new:b',
      'review:a',
    ])
  })
})

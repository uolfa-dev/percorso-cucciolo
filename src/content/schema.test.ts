import { describe, expect, it } from 'vitest'
import { DiaryEntrySchema, LessonSchema, VideoSchema } from './schema.ts'

const lesson = {
  id: 'segnale-di-rilascio',
  moduleId: 'fondamenta',
  title: 'Segnale di rilascio',
  summary: 'Riassunto',
  goal: 'Obiettivo',
  prerequisites: [],
  equipment: ['Bocconcini'],
  sessionMinutes: 5,
  steps: [{ text: 'uno' }, { text: 'due', videoId: 'tKHTYneseaw' }, { text: 'tre', videoId: 'tKHTYneseaw', startSec: 43 }],
  criteria: 'Criterio',
  mistakes: [],
  videos: [{ videoId: 'tKHTYneseaw' }],
}

const step = { text: 'passo' }

describe('LessonSchema', () => {
  it('accetta una lezione completa, anche in bozza e con nota di sicurezza', () => {
    expect(LessonSchema.safeParse(lesson).success).toBe(true)
    expect(LessonSchema.safeParse({ ...lesson, draft: true, safetyNote: 'Attenzione' }).success).toBe(true)
  })

  it.each([
    ['id non in kebab-case', { id: 'Segnale di rilascio' }],
    ['meno di 3 passi', { steps: [step, step] }],
    ['più di 8 passi', { steps: Array(9).fill(step) }],
    ['startSec senza videoId', { steps: [step, step, { text: 'tre', startSec: 10 }] }],
    ['id video malformato', { videos: [{ videoId: 'https://youtu.be/tKHTYneseaw' }] }],
    ['nessun video', { videos: [] }],
    ['durata della sessione fuori scala', { sessionMinutes: 0 }],
    ['campo sconosciuto', { prerequisite: [] }],
    ['testo vuoto', { goal: '' }],
  ])('rifiuta una lezione con %s', (_label, change) => {
    expect(LessonSchema.safeParse({ ...lesson, ...change }).success).toBe(false)
  })
})

describe('VideoSchema', () => {
  const video = { id: 'tKHTYneseaw', title: 'Titolo', publishedAt: '2011-11-05', durationSec: 550, kind: 'tutorial', playlists: [], hasTranscript: true }

  it('accetta data e durata mancanti, non date malformate', () => {
    expect(VideoSchema.safeParse(video).success).toBe(true)
    expect(VideoSchema.safeParse({ ...video, publishedAt: null, durationSec: null }).success).toBe(true)
    expect(VideoSchema.safeParse({ ...video, publishedAt: '20111105' }).success).toBe(false)
  })
})

describe('DiaryEntrySchema', () => {
  const entry = { id: 'x', date: '2026-11-23', notes: '', createdAt: '2026-11-23T10:00:00.000Z' }

  it('accetta una voce minima e rifiuta voti o minuti fuori scala', () => {
    expect(DiaryEntrySchema.safeParse(entry).success).toBe(true)
    expect(DiaryEntrySchema.safeParse({ ...entry, rating: 0 }).success).toBe(false)
    expect(DiaryEntrySchema.safeParse({ ...entry, minutes: 2.5 }).success).toBe(false)
    expect(DiaryEntrySchema.safeParse({ ...entry, date: '2026-02-30' }).success).toBe(false)
  })
})

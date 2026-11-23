import { describe, expect, it } from 'vitest'
import type { AppData } from '../store/useAppStore.ts'
import { createBackup, parseBackup } from './backup.ts'

const data: AppData = {
  progress: {
    'segnale-di-rilascio': { status: 'in-progress', checkedSteps: [0, 2] },
    tappetino: { status: 'known', checkedSteps: [] },
  },
  diary: [
    {
      id: 'abc-1',
      date: '2026-11-20',
      lessonId: 'segnale-di-rilascio',
      minutes: 5,
      rating: 4,
      notes: 'Bene in salotto, distratto in giardino.',
      createdAt: '2026-11-20T17:30:00.000Z',
    },
    { id: 'abc-2', date: '2026-11-21', notes: '', createdAt: '2026-11-21T08:00:00.000Z' },
  ],
  settings: { dogName: 'Kiko' },
}

describe('backup', () => {
  it('esporta e reimporta gli stessi dati', () => {
    const backup = createBackup(data, new Date('2026-11-23T12:00:00.000Z'))
    expect(backup.version).toBe(1)
    expect(backup.exportedAt).toBe('2026-11-23T12:00:00.000Z')
    expect(parseBackup(JSON.stringify(backup))).toEqual({ ok: true, data })
  })

  it('rifiuta un file che non è JSON', () => {
    expect(parseBackup('non è json')).toEqual({ ok: false, error: 'Il file non è un JSON valido.' })
  })

  it.each([
    ['versione sconosciuta', { version: 2 }],
    ['campo mancante', { diary: undefined }],
    ['campo in più', { altro: true }],
    ['voto fuori scala', { diary: [{ ...data.diary[0], rating: 9 }] }],
    ['data non valida', { diary: [{ ...data.diary[1], date: '21/11/2026' }] }],
    ['stato sconosciuto', { progress: { tappetino: { status: 'fatto', checkedSteps: [] } } }],
    ['id lezione non valido', { progress: { 'Non Valido': { status: 'todo', checkedSteps: [] } } }],
  ])('rifiuta un backup con %s', (_label, change) => {
    const result = parseBackup(JSON.stringify({ ...createBackup(data), ...change }))
    expect(result.ok).toBe(false)
  })
})

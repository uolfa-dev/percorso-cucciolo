import { beforeEach, describe, expect, it } from 'vitest'
import { STORAGE_KEY, useAppStore } from './useAppStore.ts'

const store = () => useAppStore.getState()

beforeEach(() => store().resetData())

describe('useAppStore', () => {
  it('una sessione su una lezione mai iniziata la porta in corso', () => {
    store().addEntry({ date: '2026-11-23', lessonId: 'tappetino', minutes: 5, notes: '' })
    expect(store().progress.tappetino).toEqual({ status: 'in-progress', checkedSteps: [] })
    expect(store().diary).toHaveLength(1)
    expect(store().diary[0]).toMatchObject({ date: '2026-11-23', lessonId: 'tappetino', minutes: 5 })
    expect(store().diary[0].id).not.toBe('')
  })

  it('una sessione non cambia lo stato di una lezione già acquisita e non tocca le voci libere', () => {
    store().setStatus('tappetino', 'mastered')
    store().addEntry({ date: '2026-11-23', lessonId: 'tappetino', notes: '' })
    store().addEntry({ date: '2026-11-23', notes: 'Passeggiata tranquilla' })
    expect(store().progress).toEqual({ tappetino: { status: 'mastered', checkedSteps: [] } })
  })

  it('spunta e toglie la spunta ai passi senza perdere lo stato', () => {
    store().toggleStep('tappetino', 2)
    store().toggleStep('tappetino', 0)
    expect(store().progress.tappetino).toEqual({ status: 'todo', checkedSteps: [0, 2] })
    store().setStatus('tappetino', 'in-progress')
    store().toggleStep('tappetino', 2)
    expect(store().progress.tappetino).toEqual({ status: 'in-progress', checkedSteps: [0] })
  })

  it('modifica ed elimina le voci del diario', () => {
    store().addEntry({ date: '2026-11-22', notes: 'prima' })
    store().addEntry({ date: '2026-11-23', notes: 'seconda' })
    const [first, second] = store().diary
    store().updateEntry(first.id, { date: '2026-11-21', lessonId: 'richiamo-base', rating: 3, notes: 'modificata' })
    expect(store().diary[0]).toEqual({
      id: first.id,
      createdAt: first.createdAt,
      date: '2026-11-21',
      lessonId: 'richiamo-base',
      rating: 3,
      notes: 'modificata',
    })
    expect(store().progress['richiamo-base']?.status).toBe('in-progress')
    store().deleteEntry(first.id)
    expect(store().diary).toEqual([second])
  })

  it('salva in localStorage solo i dati, con il numero di versione', () => {
    store().setDogName('Kiko')
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({
      state: { progress: {}, diary: [], settings: { dogName: 'Kiko' } },
      version: 1,
    })
  })

  it('sostituisce e azzera tutti i dati', () => {
    store().replaceData({
      progress: { tappetino: { status: 'known', checkedSteps: [1] } },
      diary: [{ id: 'x', date: '2026-11-01', notes: 'importata', createdAt: '2026-11-01T10:00:00.000Z' }],
      settings: { dogName: 'Halo' },
    })
    expect(store().settings.dogName).toBe('Halo')
    expect(store().diary).toHaveLength(1)
    store().resetData()
    expect(store()).toMatchObject({ progress: {}, diary: [], settings: { dogName: '' } })
  })
})

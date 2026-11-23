import { describe, expect, it } from 'vitest'
import type { Lesson, Video } from '../../src/content/schema.ts'
import { checkContent, type RawContent } from './content-checks.ts'
import { computeCoverage } from './coverage.ts'

const V1 = 'aaaaaaaaaa1'
const V2 = 'aaaaaaaaaa2'
const SHORT = 'ssssssssss1'

function video(id: string, extra: Partial<Video> = {}): Video {
  return { id, title: `Video ${id}`, publishedAt: null, durationSec: 300, kind: 'tutorial', playlists: [], hasTranscript: false, ...extra }
}

function lesson(id: string, extra: Partial<Lesson> = {}): Lesson {
  return {
    id,
    moduleId: 'calma',
    title: 'Titolo',
    summary: 'Riassunto',
    goal: 'Obiettivo',
    prerequisites: [],
    equipment: [],
    sessionMinutes: 5,
    steps: [{ text: 'uno' }, { text: 'due' }, { text: 'tre', videoId: V1, startSec: 10 }],
    criteria: 'Criterio',
    mistakes: [],
    videos: [{ videoId: V1 }],
    ...extra,
  }
}

function raw(lessons: Lesson[], extra: Partial<RawContent> = {}): RawContent {
  return {
    videos: [video(V1), video(V2), video(SHORT, { kind: 'short', durationSec: null })],
    modules: [{ id: 'calma', title: 'Calma', description: 'Descrizione', order: 1 }],
    path: {
      stages: [
        { id: 'uno', title: 'Uno', description: 'Prima tappa', kind: 'core', lessonIds: lessons.map((l) => l.id) },
        { id: 'extra', title: 'Extra', description: 'Approfondimenti', kind: 'extra', lessonIds: [] },
      ],
    },
    assignments: {},
    lessonFiles: lessons.map((l) => ({ file: `${l.moduleId}/${l.id}.json`, json: l })),
    ...extra,
  }
}

function errorsOf(content: RawContent): string {
  return checkContent(content).errors.join('\n')
}

describe('checkContent', () => {
  it('accetta contenuti coerenti', () => {
    const result = checkContent(raw([lesson('a'), lesson('b', { prerequisites: ['a'] })]))
    expect(result.errors).toEqual([])
    expect(result.content?.lessons).toHaveLength(2)
  })

  it('segnala gli errori di schema della singola lezione', () => {
    expect(errorsOf(raw([lesson('a', { steps: [{ text: 'solo uno' }] })]))).toContain('lessons/calma/a.json')
    expect(errorsOf(raw([lesson('a', { steps: [{ text: 'uno' }, { text: 'due' }, { text: 'tre', startSec: 5 }] })]))).toContain(
      'startSec richiede videoId',
    )
    const withTypo = { ...lesson('a'), prerequisite: [] }
    expect(errorsOf(raw([lesson('a')], { lessonFiles: [{ file: 'calma/a.json', json: withTypo }] }))).toContain('prerequisite')
  })

  it('richiede che il file si chiami come la lezione e stia nella cartella del modulo', () => {
    const content = raw([lesson('a')], { lessonFiles: [{ file: 'trick/altro.json', json: lesson('a') }] })
    expect(errorsOf(content)).toContain('deve essere calma/a.json')
  })

  it('segnala id duplicati e moduli inesistenti', () => {
    expect(errorsOf(raw([lesson('a'), lesson('a')]))).toContain('id duplicato a')
    expect(errorsOf(raw([lesson('a', { moduleId: 'ignoto' })]))).toContain('modulo inesistente ignoto')
  })

  it('richiede ogni lezione in una sola tappa', () => {
    const none = raw([lesson('a')])
    none.path = { stages: [{ id: 'uno', title: 'Uno', description: 'Tappa', kind: 'core', lessonIds: [] }] }
    expect(errorsOf(none)).toContain('una sola tappa di path.json (trovate: 0)')

    const twice = raw([lesson('a')])
    twice.path = {
      stages: [
        { id: 'uno', title: 'Uno', description: 'Tappa', kind: 'core', lessonIds: ['a'] },
        { id: 'due', title: 'Due', description: 'Tappa', kind: 'extra', lessonIds: ['a', 'fantasma'] },
      ],
    }
    expect(errorsOf(twice)).toContain('una sola tappa di path.json (trovate: 2)')
    expect(errorsOf(twice)).toContain('lezione inesistente fantasma')
  })

  it('controlla i prerequisiti: esistenza, cicli, core che dipende da extra', () => {
    expect(errorsOf(raw([lesson('a', { prerequisites: ['ignota'] })]))).toContain('prerequisito non valido ignota')
    expect(errorsOf(raw([lesson('a', { prerequisites: ['b'] }), lesson('b', { prerequisites: ['a'] })]))).toContain(
      'ciclo nei prerequisiti: a -> b -> a',
    )

    const coreNeedsExtra = raw([lesson('a', { prerequisites: ['b'] }), lesson('b')])
    coreNeedsExtra.path = {
      stages: [
        { id: 'uno', title: 'Uno', description: 'Tappa', kind: 'core', lessonIds: ['a'] },
        { id: 'due', title: 'Due', description: 'Tappa', kind: 'extra', lessonIds: ['b'] },
      ],
    }
    expect(errorsOf(coreNeedsExtra)).toContain('prerequisito fuori dal percorso core (b)')
  })

  it('controlla i riferimenti ai video', () => {
    expect(errorsOf(raw([lesson('a', { videos: [{ videoId: 'zzzzzzzzzz9' }] })]))).toContain('zzzzzzzzzz9 non è un tutorial')
    expect(errorsOf(raw([lesson('a', { videos: [{ videoId: V1 }, { videoId: SHORT }] })]))).toContain(`${SHORT} non è un tutorial`)
    expect(errorsOf(raw([lesson('a', { videos: [{ videoId: V1, startSec: 300 }] })]))).toContain('startSec 300 oltre la durata')
    expect(errorsOf(raw([lesson('a', { videos: [{ videoId: V2 }] })]))).toContain(`un passo cita ${V1}, assente da videos`)
    expect(errorsOf(raw([lesson('a', { videos: [{ videoId: V1 }, { videoId: V1 }] })]))).toContain('video ripetuto')
  })

  it('controlla le assegnazioni', () => {
    const content = raw([lesson('a')], {
      assignments: { [V1]: { exclude: 'vlog' }, [V2]: { module: 'ignoto' }, [SHORT]: { module: 'calma' } },
    })
    const errors = errorsOf(content)
    expect(errors).toContain(`${V1} è escluso ma citato da una lezione`)
    expect(errors).toContain(`${V2} assegnato al modulo inesistente ignoto`)
    expect(errors).toContain(`${SHORT} non è un tutorial del catalogo`)
  })
})

describe('computeCoverage', () => {
  it('conta coperti, esclusi e in sospeso, ignorando Shorts e bozze', () => {
    const { content } = checkContent(
      raw([lesson('a'), lesson('b', { draft: true, videos: [{ videoId: V2 }], steps: [{ text: 'uno' }, { text: 'due' }, { text: 'tre' }] })], {
        videos: [video(V1), video(V2), video('cccccccccc3'), video(SHORT, { kind: 'short' })],
        assignments: { [V2]: { module: 'calma' }, cccccccccc3: { exclude: 'promo' } },
      }),
    )
    const rows = computeCoverage(content!)
    expect(rows.map((r) => [r.video.id, r.status, r.moduleId, r.exclusion])).toEqual([
      [V1, 'coperto', null, null],
      [V2, 'in sospeso', 'calma', null],
      ['cccccccccc3', 'escluso', null, 'promo'],
    ])
  })
})

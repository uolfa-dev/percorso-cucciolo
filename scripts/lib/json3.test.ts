import { describe, expect, it } from 'vitest'
import { formatTimestamp, json3ToParagraphs } from './json3.ts'

describe('json3ToParagraphs', () => {
  it('unisce i segmenti e raggruppa per finestra temporale', () => {
    const paragraphs = json3ToParagraphs({
      events: [
        { tStartMs: 0 },
        { tStartMs: 80, segs: [{ utf8: 'hi' }, { utf8: ' everyone' }] },
        { tStartMs: 2500, segs: [{ utf8: '\n' }] },
        { tStartMs: 12000, segs: [{ utf8: 'today we train\na release cue' }] },
        { tStartMs: 31000, segs: [{ utf8: 'first step' }] },
        { tStartMs: 95000, segs: [{ utf8: 'second step' }] },
      ],
    })
    expect(paragraphs).toEqual([
      { startSec: 0, text: 'hi everyone today we train a release cue' },
      { startSec: 31, text: 'first step' },
      { startSec: 95, text: 'second step' },
    ])
  })

  it('scarta le righe ripetute di seguito', () => {
    const paragraphs = json3ToParagraphs({
      events: [
        { tStartMs: 1000, segs: [{ utf8: 'good dog' }] },
        { tStartMs: 3000, segs: [{ utf8: 'good dog' }] },
        { tStartMs: 5000, segs: [{ utf8: 'and release' }] },
      ],
    })
    expect(paragraphs).toEqual([{ startSec: 1, text: 'good dog and release' }])
  })

  it('restituisce una lista vuota senza eventi', () => {
    expect(json3ToParagraphs({})).toEqual([])
  })
})

describe('formatTimestamp', () => {
  it('usa mm:ss sotto l\'ora e h:mm:ss oltre', () => {
    expect(formatTimestamp(0)).toBe('00:00')
    expect(formatTimestamp(83)).toBe('01:23')
    expect(formatTimestamp(3723)).toBe('1:02:03')
  })
})

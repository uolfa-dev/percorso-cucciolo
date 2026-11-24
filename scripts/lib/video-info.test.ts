import { describe, expect, it } from 'vitest'
import { slimVideoInfo, type VideoInfo } from './video-info.ts'

describe('slimVideoInfo', () => {
  it('tiene solo i campi usati e le lingue dei sottotitoli manuali', () => {
    const raw = {
      id: 'tKHTYneseaw',
      title: 'How to train a RELEASE CUE',
      duration: 550,
      upload_date: '20111105',
      language: 'en-US',
      description: 'Descrizione',
      chapters: [{ start_time: 0, title: 'Teaching the release cue' }],
      subtitles: { en: [{ ext: 'json3', url: 'https://example.invalid/firmato' }] },
      automatic_captions: { 'en-orig': [{ ext: 'json3', url: 'https://example.invalid/asr' }] },
      formats: [{ format_id: '18', url: 'https://example.invalid/video' }],
      thumbnails: [{ url: 'https://example.invalid/jpg' }],
    } as VideoInfo

    expect(slimVideoInfo(raw)).toEqual({
      id: 'tKHTYneseaw',
      title: 'How to train a RELEASE CUE',
      duration: 550,
      upload_date: '20111105',
      language: 'en-US',
      description: 'Descrizione',
      chapters: [{ start_time: 0, title: 'Teaching the release cue' }],
      subtitles: { en: [] },
    })
  })

  it('regge i campi mancanti', () => {
    expect(slimVideoInfo({ id: 'aaaaaaaaaa1', title: 'Titolo' })).toEqual({ id: 'aaaaaaaaaa1', title: 'Titolo', subtitles: {} })
  })
})

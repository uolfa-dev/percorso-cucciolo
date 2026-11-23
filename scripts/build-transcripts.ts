import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { formatTimestamp, json3ToParagraphs, type Json3 } from './lib/json3.ts'
import { RAW_VIDEOS, TRANSCRIPTS } from './lib/paths.ts'

type VideoInfo = {
  id: string
  title: string
  duration?: number
  upload_date?: string
  description?: string
  chapters?: { start_time: number; title: string }[] | null
  subtitles?: Record<string, unknown>
}

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(join(RAW_VIDEOS, file), 'utf8')) as T
}

mkdirSync(TRANSCRIPTS, { recursive: true })
const files = readdirSync(RAW_VIDEOS)
const withoutSubtitles: string[] = []
let written = 0

for (const infoFile of files.filter((name) => name.endsWith('.info.json'))) {
  const info = readJson<VideoInfo>(infoFile)
  const manualLangs = new Set(Object.keys(info.subtitles ?? {}))
  // Preferenza: sottotitoli manuali, poi automatici; "en" prima delle altre varianti
  const rank = (lang: string) => (manualLangs.has(lang) ? 0 : 2) + (lang === 'en' ? 0 : 1)
  const [lang] = files
    .filter((name) => name.startsWith(`${info.id}.`) && name.endsWith('.json3'))
    .map((name) => name.slice(info.id.length + 1, -'.json3'.length))
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))

  const paragraphs = lang ? json3ToParagraphs(readJson<Json3>(`${info.id}.${lang}.json3`)) : []
  if (paragraphs.length === 0) {
    withoutSubtitles.push(info.id)
    continue
  }

  const date = info.upload_date?.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3')
  const lines = [
    `# ${info.title}`,
    '',
    `- Video: https://www.youtube.com/watch?v=${info.id}`,
    `- Durata: ${info.duration === undefined ? 'n/d' : formatTimestamp(info.duration)}`,
    `- Pubblicato: ${date ?? 'n/d'}`,
    `- Sottotitoli: ${lang} (${manualLangs.has(lang) ? 'manuali' : 'automatici'})`,
    '',
    '## Descrizione',
    '',
    info.description?.trim() || '(nessuna)',
    '',
  ]
  if (info.chapters?.length) {
    lines.push('## Capitoli', '', ...info.chapters.map((c) => `- [${formatTimestamp(c.start_time)}] ${c.title}`), '')
  }
  lines.push('## Trascrizione', '', ...paragraphs.flatMap((p) => [`[${formatTimestamp(p.startSec)}] ${p.text}`, '']))

  writeFileSync(join(TRANSCRIPTS, `${info.id}.md`), lines.join('\n'))
  written += 1
}

console.log(`Trascrizioni scritte: ${written}. Video senza sottotitoli: ${withoutSubtitles.length}.`)
if (withoutSubtitles.length > 0) console.log(withoutSubtitles.join(' '))

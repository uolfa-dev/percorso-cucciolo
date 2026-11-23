import { readFileSync } from 'node:fs'
import { VIDEO_ID_RE } from '../../src/content/schema.ts'

// Voce di un elenco "flat" di yt-dlp (scheda del canale o playlist)
export type FlatEntry = { id: string; title?: string; duration?: number | null; availability?: string | null }
export type FlatPlaylist = { title?: string; entries?: FlatEntry[] }

export function readFlatPlaylist(file: string): FlatPlaylist {
  return JSON.parse(readFileSync(file, 'utf8')) as FlatPlaylist
}

// I video riservati agli abbonati del canale non sono contenuti gratuiti: restano fuori
export function isPublicVideo(entry: FlatEntry): boolean {
  return VIDEO_ID_RE.test(entry.id) && (!entry.availability || ['public', 'unlisted'].includes(entry.availability))
}

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { VIDEO_ID_RE, type Video } from '../src/content/schema.ts'
import { CONTENT, RAW_CHANNEL, RAW_VIDEOS, TRANSCRIPTS } from './lib/paths.ts'

type FlatEntry = { id: string; title?: string; duration?: number | null; availability?: string | null }
type FlatPlaylist = { title?: string; entries?: FlatEntry[] }
type VideoInfo = { title?: string; duration?: number; upload_date?: string }

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, 'utf8')) as T
}

const playlistsByVideo = new Map<string, Set<string>>()
const playlistsDir = join(RAW_CHANNEL, 'playlists')
for (const name of readdirSync(playlistsDir).filter((n) => n.endsWith('.json'))) {
  const playlist = readJson<FlatPlaylist>(join(playlistsDir, name))
  if (!playlist.title) continue
  for (const entry of playlist.entries ?? []) {
    const titles = playlistsByVideo.get(entry.id) ?? new Set()
    playlistsByVideo.set(entry.id, titles.add(playlist.title))
  }
}

// I video riservati agli abbonati del canale non sono contenuti gratuiti: restano fuori
function isPublic(entry: FlatEntry): boolean {
  return VIDEO_ID_RE.test(entry.id) && (!entry.availability || ['public', 'unlisted'].includes(entry.availability))
}

function toVideo(entry: FlatEntry, kind: Video['kind']): Video {
  const infoFile = join(RAW_VIDEOS, `${entry.id}.info.json`)
  const info = existsSync(infoFile) ? readJson<VideoInfo>(infoFile) : {}
  const uploadDate = info.upload_date?.match(/^(\d{4})(\d{2})(\d{2})$/)
  const duration = info.duration ?? entry.duration
  return {
    id: entry.id,
    title: (info.title ?? entry.title ?? entry.id).replace(/\s+/g, ' ').trim(),
    publishedAt: uploadDate ? `${uploadDate[1]}-${uploadDate[2]}-${uploadDate[3]}` : null,
    durationSec: duration == null ? null : Math.round(duration),
    kind,
    playlists: [...(playlistsByVideo.get(entry.id) ?? [])].sort(),
    hasTranscript: existsSync(join(TRANSCRIPTS, `${entry.id}.md`)),
  }
}

const longVideos = readJson<FlatPlaylist>(join(RAW_CHANNEL, 'videos.json')).entries ?? []
const shorts = readJson<FlatPlaylist>(join(RAW_CHANNEL, 'shorts.json')).entries ?? []
const videos = [
  ...longVideos.filter(isPublic).map((entry) => toVideo(entry, 'tutorial')),
  ...shorts.filter(isPublic).map((entry) => toVideo(entry, 'short')),
]

const outDir = join(CONTENT, 'catalog')
mkdirSync(outDir, { recursive: true })
// Una voce per riga: diff leggibili quando il catalogo viene rigenerato
writeFileSync(join(outDir, 'videos.json'), `[\n${videos.map((v) => `  ${JSON.stringify(v)}`).join(',\n')}\n]\n`)

const tutorials = videos.filter((v) => v.kind === 'tutorial')
console.log(
  `Catalogo: ${tutorials.length} tutorial (${tutorials.filter((v) => v.hasTranscript).length} con trascrizione, ` +
    `${tutorials.filter((v) => v.publishedAt === null).length} senza metadati), ` +
    `${videos.length - tutorials.length} Shorts, ` +
    `${longVideos.length + shorts.length - videos.length} non pubblici esclusi.`,
)

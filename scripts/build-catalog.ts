import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Video } from '../src/content/schema.ts'
import { isPublicVideo, readFlatPlaylist, type FlatEntry } from './lib/channel.ts'
import { CONTENT, RAW_CHANNEL, RAW_VIDEOS, TRANSCRIPTS } from './lib/paths.ts'
import type { VideoInfo } from './lib/video-info.ts'

const playlistsByVideo = new Map<string, Set<string>>()
const playlistsDir = join(RAW_CHANNEL, 'playlists')
for (const name of readdirSync(playlistsDir).filter((n) => n.endsWith('.json'))) {
  const playlist = readFlatPlaylist(join(playlistsDir, name))
  if (!playlist.title) continue
  for (const entry of playlist.entries ?? []) {
    const titles = playlistsByVideo.get(entry.id) ?? new Set()
    playlistsByVideo.set(entry.id, titles.add(playlist.title))
  }
}

function toVideo(entry: FlatEntry, kind: Video['kind']): Video {
  const infoFile = join(RAW_VIDEOS, `${entry.id}.info.json`)
  const info: Partial<VideoInfo> = existsSync(infoFile) ? JSON.parse(readFileSync(infoFile, 'utf8')) : {}
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

const longVideos = readFlatPlaylist(join(RAW_CHANNEL, 'videos.json')).entries ?? []
const shorts = readFlatPlaylist(join(RAW_CHANNEL, 'shorts.json')).entries ?? []
const videos = [
  ...longVideos.filter(isPublicVideo).map((entry) => toVideo(entry, 'tutorial')),
  ...shorts.filter(isPublicVideo).map((entry) => toVideo(entry, 'short')),
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

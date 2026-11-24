import { spawnSync } from 'node:child_process'
import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { parseArgs } from 'node:util'
import { isPublicVideo, readFlatPlaylist } from './lib/channel.ts'
import { RAW_CHANNEL, RAW_VIDEOS, ROOT } from './lib/paths.ts'
import { slimVideoInfo } from './lib/video-info.ts'

const CHANNEL = 'https://www.youtube.com/@kikopup'
const MAX_CONSECUTIVE_FAILURES = 3

const { values: options, positionals: extraYtDlpArgs } = parseArgs({
  options: {
    // Solo l'elenco del canale, senza metadati e sottotitoli dei singoli video
    'list-only': { type: 'boolean', default: false },
    // Ignora HTTP(S)_PROXY: per le reti senza proxy aziendale
    direct: { type: 'boolean', default: false },
    limit: { type: 'string' },
    // Solo questi video (id separati da virgola), nell'ordine dato
    only: { type: 'string' },
  },
  // Gli argomenti dopo "--" passano a yt-dlp così come sono
  allowPositionals: true,
})

function ytDlpCommand(): string[] {
  if (process.env.YT_DLP) return [process.env.YT_DLP]
  const venvPython = join(ROOT, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python')
  return existsSync(venvPython) ? [venvPython, '-m', 'yt_dlp'] : ['yt-dlp']
}

const [executable, ...baseArgs] = [
  ...ytDlpCommand(),
  '--js-runtimes',
  `node:${process.execPath}`,
  ...(options.direct ? ['--proxy', ''] : []),
  ...extraYtDlpArgs,
]

function ytDlp(args: string[], stdout: 'inherit' | number = 'inherit'): boolean {
  const result = spawnSync(executable, [...baseArgs, ...args], { stdio: ['ignore', stdout, 'inherit'] })
  if (result.error) throw result.error
  return result.status === 0
}

function dumpFlatPlaylist(url: string, file: string): boolean {
  const partial = `${file}.tmp`
  const fd = openSync(partial, 'w')
  let ok: boolean
  try {
    ok = ytDlp(['--flat-playlist', '--dump-single-json', '--sleep-requests', '1', url], fd)
  } finally {
    closeSync(fd)
  }
  if (ok) renameSync(partial, file)
  return ok
}

function entriesOf(file: string) {
  return readFlatPlaylist(join(RAW_CHANNEL, file)).entries ?? []
}

mkdirSync(join(RAW_CHANNEL, 'playlists'), { recursive: true })
mkdirSync(RAW_VIDEOS, { recursive: true })

for (const tab of ['videos', 'shorts', 'playlists']) {
  console.log(`Elenco della scheda ${tab}...`)
  if (!dumpFlatPlaylist(`${CHANNEL}/${tab}`, join(RAW_CHANNEL, `${tab}.json`))) {
    console.error(`Elenco della scheda ${tab} non riuscito.`)
    process.exit(1)
  }
}

const playlistIds = entriesOf('playlists.json')
  .map((entry) => entry.id)
  .filter((id) => /^[A-Za-z0-9_-]+$/.test(id))
for (const [index, id] of playlistIds.entries()) {
  console.log(`Playlist ${index + 1}/${playlistIds.length}: ${id}`)
  if (!dumpFlatPlaylist(`https://www.youtube.com/playlist?list=${id}`, join(RAW_CHANNEL, 'playlists', `${id}.json`))) {
    console.warn(`Playlist ${id} non letta.`)
  }
}

const videoIds = entriesOf('videos.json')
  .filter(isPublicVideo)
  .map((entry) => entry.id)
const downloaded = new Set(
  readdirSync(RAW_VIDEOS)
    .filter((name) => name.endsWith('.info.json'))
    .map((name) => name.slice(0, -'.info.json'.length)),
)
const limit = options.limit === undefined ? Infinity : Number.parseInt(options.limit, 10)
if (Number.isNaN(limit)) throw new Error(`--limit non valido: ${options.limit}`)
const wanted = options.only?.split(',') ?? videoIds
const unknown = wanted.filter((id) => !videoIds.includes(id))
if (unknown.length > 0) throw new Error(`--only: video non presenti tra quelli pubblici del canale: ${unknown.join(', ')}`)
const missing = wanted.filter((id) => !downloaded.has(id))
const pending = missing.slice(0, limit)
console.log(
  `${videoIds.length} video pubblici nel canale, ${wanted.length - missing.length} su ${wanted.length} già scaricati, ` +
    `${pending.length} da scaricare ora.`,
)

if (options['list-only']) process.exit(0)

const failed: string[] = []
let succeeded = 0
let consecutiveFailures = 0
for (const [index, id] of pending.entries()) {
  console.log(`[${index + 1}/${pending.length}] ${id}`)
  const infoFile = join(RAW_VIDEOS, `${id}.info.json`)
  // yt-dlp scrive il file info solo dopo i sottotitoli: se esiste, il video è completo
  const ok =
    ytDlp([
      '--skip-download',
      '--write-info-json',
      // Solo la trascrizione automatica originale: "en" è una sua traduzione e costerebbe una richiesta in più
      '--write-auto-subs',
      '--sub-langs',
      'en.*-orig',
      '--sub-format',
      'json3',
      // Servono solo metadati e sottotitoli: niente player JS né manifest dei formati video
      '--extractor-args',
      'youtube:player_skip=js;skip=hls,dash',
      '--ignore-no-formats-error',
      '--no-progress',
      '--sleep-requests',
      '1',
      '--sleep-subtitles',
      '2',
      '-o',
      join(RAW_VIDEOS, '%(id)s.%(ext)s'),
      `https://www.youtube.com/watch?v=${id}`,
    ]) && existsSync(infoFile)
  if (ok) {
    const slim = `${infoFile}.tmp`
    writeFileSync(slim, JSON.stringify(slimVideoInfo(JSON.parse(readFileSync(infoFile, 'utf8')))))
    renameSync(slim, infoFile)
    succeeded += 1
    consecutiveFailures = 0
  } else {
    failed.push(id)
    consecutiveFailures += 1
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      console.error(
        `\n${MAX_CONSECUTIVE_FAILURES} errori di seguito: mi fermo. Se l'errore è HTTP 429, YouTube sta rifiutando ` +
          'le richieste da questa rete: riprova più tardi o da un\'altra rete (vedi --direct).',
      )
      break
    }
  }
  await sleep(1000)
}

console.log(`\nScaricati ${succeeded} video su ${pending.length}.`)
if (failed.length > 0) {
  console.log(`Non riusciti (verranno ritentati alla prossima esecuzione): ${failed.join(', ')}`)
  process.exit(1)
}

import { spawnSync } from 'node:child_process'
import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, renameSync } from 'node:fs'
import { join } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { parseArgs } from 'node:util'
import { VIDEO_ID_RE } from '../src/content/schema.ts'
import { RAW_CHANNEL, RAW_VIDEOS, ROOT } from './lib/paths.ts'

const CHANNEL = 'https://www.youtube.com/@kikopup'
const MAX_CONSECUTIVE_FAILURES = 3

const { values: options, positionals: extraYtDlpArgs } = parseArgs({
  options: {
    // Solo l'elenco del canale, senza metadati e sottotitoli dei singoli video
    'list-only': { type: 'boolean', default: false },
    // Ignora HTTP(S)_PROXY: per le reti senza proxy aziendale
    direct: { type: 'boolean', default: false },
    limit: { type: 'string' },
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

function entryIds(file: string): string[] {
  const { entries = [] } = JSON.parse(readFileSync(file, 'utf8')) as { entries?: { id?: string }[] }
  return entries.flatMap((entry) => (entry.id ? [entry.id] : []))
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

const playlistIds = entryIds(join(RAW_CHANNEL, 'playlists.json')).filter((id) => /^[A-Za-z0-9_-]+$/.test(id))
for (const [index, id] of playlistIds.entries()) {
  console.log(`Playlist ${index + 1}/${playlistIds.length}: ${id}`)
  if (!dumpFlatPlaylist(`https://www.youtube.com/playlist?list=${id}`, join(RAW_CHANNEL, 'playlists', `${id}.json`))) {
    console.warn(`Playlist ${id} non letta.`)
  }
}

const videoIds = entryIds(join(RAW_CHANNEL, 'videos.json')).filter((id) => VIDEO_ID_RE.test(id))
const downloaded = new Set(
  readdirSync(RAW_VIDEOS)
    .filter((name) => name.endsWith('.info.json'))
    .map((name) => name.slice(0, -'.info.json'.length)),
)
const limit = options.limit === undefined ? Infinity : Number.parseInt(options.limit, 10)
if (Number.isNaN(limit)) throw new Error(`--limit non valido: ${options.limit}`)
const pending = videoIds.filter((id) => !downloaded.has(id)).slice(0, limit)
console.log(`${videoIds.length} video nel canale, ${downloaded.size} già scaricati, ${pending.length} da scaricare ora.`)

if (options['list-only']) process.exit(0)

const failed: string[] = []
let succeeded = 0
let consecutiveFailures = 0
for (const [index, id] of pending.entries()) {
  console.log(`[${index + 1}/${pending.length}] ${id}`)
  // yt-dlp scrive il file info solo dopo i sottotitoli: se esiste, il video è completo
  const ok = ytDlp([
    '--skip-download',
    '--write-info-json',
    '--write-subs',
    '--write-auto-subs',
    '--sub-langs',
    'en.*',
    '--sub-format',
    'json3',
    '--ignore-no-formats-error',
    '--no-progress',
    '--sleep-requests',
    '1',
    '--sleep-subtitles',
    '2',
    '-o',
    join(RAW_VIDEOS, '%(id)s.%(ext)s'),
    `https://www.youtube.com/watch?v=${id}`,
  ])
  if (ok) {
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

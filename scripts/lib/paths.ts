import { resolve } from 'node:path'

export const ROOT = resolve(import.meta.dirname, '../..')
export const RAW_CHANNEL = resolve(ROOT, 'data/raw/channel')
export const RAW_VIDEOS = resolve(ROOT, 'data/raw/videos')
export const TRANSCRIPTS = resolve(ROOT, 'data/transcripts')
export const CONTENT = resolve(ROOT, 'content')

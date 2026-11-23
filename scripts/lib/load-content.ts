import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { RawContent } from './content-checks.ts'
import { CONTENT } from './paths.ts'

function readJson(file: string): unknown {
  try {
    return JSON.parse(readFileSync(join(CONTENT, file), 'utf8'))
  } catch (error) {
    throw new Error(`content/${file}: ${(error as Error).message}`)
  }
}

export function loadRawContent(): RawContent {
  const lessonsDir = join(CONTENT, 'lessons')
  const lessonFiles = existsSync(lessonsDir)
    ? readdirSync(lessonsDir, { recursive: true, encoding: 'utf8' })
        .filter((name) => name.endsWith('.json'))
        .map((name) => name.replaceAll('\\', '/'))
        .sort()
    : []
  return {
    videos: readJson('catalog/videos.json'),
    modules: readJson('modules.json'),
    path: readJson('path.json'),
    assignments: readJson('catalog/assignments.json'),
    lessonFiles: lessonFiles.map((file) => ({ file, json: readJson(`lessons/${file}`) })),
  }
}

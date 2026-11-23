import { z } from 'zod'
import { BackupSchema, type Backup } from '../content/schema.ts'
import type { AppData } from '../store/useAppStore.ts'

export function createBackup(data: AppData, now = new Date()): Backup {
  return {
    version: 1,
    exportedAt: now.toISOString(),
    progress: data.progress,
    diary: data.diary,
    settings: data.settings,
  }
}

export function parseBackup(text: string): { ok: true; data: AppData } | { ok: false; error: string } {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { ok: false, error: 'Il file non è un JSON valido.' }
  }
  const result = BackupSchema.safeParse(json)
  if (!result.success) return { ok: false, error: z.prettifyError(result.error) }
  const { progress, diary, settings } = result.data
  return { ok: true, data: { progress, diary, settings } }
}

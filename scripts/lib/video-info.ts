// I campi dei metadati di yt-dlp che il progetto usa: il file completo pesa circa 10 MB per video
export type VideoInfo = {
  id: string
  title: string
  duration?: number
  upload_date?: string
  language?: string
  description?: string
  chapters?: { start_time: number; title: string }[] | null
  // Chiavi = lingue dei sottotitoli manuali disponibili
  subtitles?: Record<string, unknown>
}

export function slimVideoInfo(raw: VideoInfo): VideoInfo {
  const { id, title, duration, upload_date, language, description, chapters, subtitles } = raw
  const manualLangs = Object.keys(subtitles ?? {}).map((lang) => [lang, []])
  return { id, title, duration, upload_date, language, description, chapters, subtitles: Object.fromEntries(manualLangs) }
}

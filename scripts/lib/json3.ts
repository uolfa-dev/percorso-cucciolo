export type Json3 = {
  events?: { tStartMs?: number; segs?: { utf8?: string }[] }[]
}

export type Paragraph = { startSec: number; text: string }

export function json3ToParagraphs(json3: Json3, windowSec = 30): Paragraph[] {
  const paragraphs: Paragraph[] = []
  let previousLine = ''
  for (const event of json3.events ?? []) {
    const line = (event.segs ?? [])
      .map((seg) => seg.utf8 ?? '')
      .join('')
      .replace(/\s+/g, ' ')
      .trim()
    // I sottotitoli automatici ripetono spesso la riga precedente
    if (!line || line === previousLine) continue
    previousLine = line

    const startSec = Math.floor((event.tStartMs ?? 0) / 1000)
    const current = paragraphs.at(-1)
    if (current && startSec - current.startSec < windowSec) current.text += ` ${line}`
    else paragraphs.push({ startSec, text: line })
  }
  return paragraphs
}

export function formatTimestamp(totalSec: number): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const hours = Math.floor(totalSec / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const seconds = Math.floor(totalSec % 60)
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`
}

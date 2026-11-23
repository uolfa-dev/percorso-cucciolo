import { VIDEO_ID_RE } from '../content/schema.ts'
import styles from './VideoEmbed.module.css'

export function watchUrl(videoId: string, startSec = 0): string {
  return `https://www.youtube.com/watch?v=${videoId}${startSec > 0 ? `&t=${startSec}s` : ''}`
}

type Props = {
  videoId: string
  title: string
  startSec?: number
  autoplay?: boolean
}

export function VideoEmbed({ videoId, title, startSec = 0, autoplay = false }: Props) {
  if (!VIDEO_ID_RE.test(videoId)) return null
  const params = new URLSearchParams({ start: String(startSec), rel: '0' })
  if (autoplay) params.set('autoplay', '1')
  // Usato anche come key: un iframe nuovo a ogni salto non aggiunge voci alla cronologia
  const src = `https://www.youtube-nocookie.com/embed/${videoId}?${params}`
  return (
    <div className={styles.wrapper}>
      {/* Senza referrer il player può dare l'errore 153: niente referrerPolicy="no-referrer" */}
      <iframe
        key={src}
        className={styles.frame}
        src={src}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
      <a href={watchUrl(videoId, startSec)} target="_blank" rel="noopener noreferrer">
        Apri su YouTube
      </a>
    </div>
  )
}

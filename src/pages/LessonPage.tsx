import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EntryDialog } from '../components/EntryDialog.tsx'
import { VideoEmbed, watchUrl } from '../components/VideoEmbed.tsx'
import { lessonsById, modulesById, videosById } from '../content/index.ts'
import type { Lesson } from '../content/schema.ts'
import { formatClock } from '../logic/format.ts'
import { isDone, STATUS_LABELS, statusOf } from '../logic/progress.ts'
import { useAppStore } from '../store/useAppStore.ts'
import ui from '../ui.module.css'
import styles from './LessonPage.module.css'

function videoTitle(videoId: string): string {
  return videosById.get(videoId)?.title ?? 'Video'
}

function LessonView({ lesson }: { lesson: Lesson }) {
  const progress = useAppStore((state) => state.progress)
  const sessionCount = useAppStore((state) => state.diary.filter((entry) => entry.lessonId === lesson.id).length)
  const setStatus = useAppStore((state) => state.setStatus)
  const toggleStep = useAppStore((state) => state.toggleStep)

  const [firstVideo] = lesson.videos
  const [player, setPlayer] = useState({
    videoId: firstVideo.videoId,
    startSec: firstVideo.startSec ?? 0,
    autoplay: false,
  })
  const [dialogOpen, setDialogOpen] = useState(false)
  const playerRef = useRef<HTMLElement>(null)

  const status = statusOf(progress, lesson.id)
  const checkedSteps = progress[lesson.id]?.checkedSteps ?? []

  function play(videoId: string, startSec = 0) {
    setPlayer({ videoId, startSec, autoplay: true })
    playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className={ui.page}>
      <header className={ui.stack}>
        <Link to="/percorso">← Percorso</Link>
        <h1 className={ui.title}>{lesson.title}</h1>
        <div className={ui.row}>
          <span className={ui.badge}>{modulesById.get(lesson.moduleId)?.title}</span>
          <span className={ui.badgeMuted}>{STATUS_LABELS[status]}</span>
          {lesson.draft && <span className={ui.badgeAccent}>Bozza</span>}
        </div>
        <p>{lesson.summary}</p>
        {lesson.draft && (
          <p className={ui.notice}>
            Bozza provvisoria: scritta dalla descrizione e dai capitoli del video, non ancora verificata sulla
            trascrizione.
          </p>
        )}
      </header>

      <section className={ui.card} aria-labelledby="lesson-goal">
        <h2 id="lesson-goal" className={ui.sectionTitle}>
          Obiettivo
        </h2>
        <p>{lesson.goal}</p>
        <p className={ui.muted}>Durata consigliata: {lesson.sessionMinutes} minuti per sessione.</p>
        {lesson.equipment.length > 0 && <p className={ui.muted}>Occorrente: {lesson.equipment.join(', ')}.</p>}
      </section>

      {lesson.prerequisites.length > 0 && (
        <section className={ui.card} aria-labelledby="lesson-prerequisites">
          <h2 id="lesson-prerequisites" className={ui.sectionTitle}>
            Prima di questa lezione
          </h2>
          <ul className={ui.list}>
            {lesson.prerequisites.map((id) => (
              <li key={id} className={ui.row}>
                <Link to={`/lezione/${id}`}>{lessonsById.get(id)?.title ?? id}</Link>
                <span className={ui.muted}>{STATUS_LABELS[statusOf(progress, id)]}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section ref={playerRef} className={`${ui.card} ${styles.player}`} aria-labelledby="lesson-video">
        <h2 id="lesson-video" className={ui.sectionTitle}>
          Video
        </h2>
        <VideoEmbed {...player} title={videoTitle(player.videoId)} />
        {lesson.videos.length > 1 && (
          <ul className={ui.list}>
            {lesson.videos.map(({ videoId, startSec, label }) => (
              <li key={videoId}>
                <button
                  type="button"
                  className={styles.videoButton}
                  aria-pressed={videoId === player.videoId}
                  onClick={() => play(videoId, startSec)}
                >
                  {label ?? videoTitle(videoId)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={ui.card} aria-labelledby="lesson-steps">
        <h2 id="lesson-steps" className={ui.sectionTitle}>
          Passi
        </h2>
        <ol className={ui.list}>
          {lesson.steps.map(({ text, videoId, startSec = 0 }, index) => {
            const checked = checkedSteps.includes(index)
            return (
              <li key={index} className={styles.step}>
                <label className={styles.stepLabel}>
                  <input type="checkbox" checked={checked} onChange={() => toggleStep(lesson.id, index)} />
                  <span className={checked ? styles.stepDone : undefined}>
                    {index + 1}. {text}
                  </span>
                </label>
                {videoId && (
                  <button
                    type="button"
                    className={styles.timeButton}
                    aria-label={`Guarda il passo ${index + 1} nel video, dal minuto ${formatClock(startSec)}`}
                    onClick={() => play(videoId, startSec)}
                  >
                    <svg viewBox="0 0 12 12" aria-hidden="true">
                      <path d="M2 1l9 5-9 5z" />
                    </svg>
                    {formatClock(startSec)}
                  </button>
                )}
              </li>
            )
          })}
        </ol>
      </section>

      <section className={ui.card} aria-labelledby="lesson-criteria">
        <h2 id="lesson-criteria" className={ui.sectionTitle}>
          Quando passare oltre
        </h2>
        <p>{lesson.criteria}</p>
      </section>

      {lesson.mistakes.length > 0 && (
        <section className={ui.card} aria-labelledby="lesson-mistakes">
          <h2 id="lesson-mistakes" className={ui.sectionTitle}>
            Errori comuni
          </h2>
          <ul className={ui.bullets}>
            {lesson.mistakes.map((mistake) => (
              <li key={mistake}>{mistake}</li>
            ))}
          </ul>
        </section>
      )}

      {lesson.safetyNote && (
        <p className={ui.notice}>
          <strong>Sicurezza.</strong> {lesson.safetyNote}
        </p>
      )}

      <section className={ui.stack} aria-label="Azioni">
        <div className={ui.row}>
          <button type="button" className={ui.buttonPrimary} onClick={() => setDialogOpen(true)}>
            Registra sessione
          </button>
          {isDone(status) ? (
            <button
              type="button"
              className={ui.button}
              onClick={() => setStatus(lesson.id, sessionCount > 0 ? 'in-progress' : 'todo')}
            >
              Annulla «{STATUS_LABELS[status]}»
            </button>
          ) : (
            <>
              <button type="button" className={ui.button} onClick={() => setStatus(lesson.id, 'mastered')}>
                Segna acquisita
              </button>
              <button type="button" className={ui.button} onClick={() => setStatus(lesson.id, 'known')}>
                La sa già
              </button>
            </>
          )}
        </div>
        {sessionCount > 0 && (
          <p className={ui.muted}>
            Sessioni registrate nel <Link to="/diario">diario</Link>: {sessionCount}.
          </p>
        )}
      </section>

      <footer className={`${ui.muted} ${ui.stack}`}>
        <p>
          Questa scheda è un riassunto dei video di Kikopup (Emily Larlham). La dimostrazione completa è nei video
          originali:
        </p>
        <ul className={ui.bullets}>
          {lesson.videos.map(({ videoId }) => (
            <li key={videoId}>
              <a href={watchUrl(videoId)} target="_blank" rel="noopener noreferrer">
                {videoTitle(videoId)}
              </a>
            </li>
          ))}
        </ul>
      </footer>

      {dialogOpen && <EntryDialog lessonId={lesson.id} onClose={() => setDialogOpen(false)} />}
    </div>
  )
}

export function LessonPage() {
  const { id = '' } = useParams()
  const lesson = lessonsById.get(id)
  if (!lesson) {
    return (
      <div className={ui.page}>
        <h1 className={ui.title}>Lezione non trovata</h1>
        <p>
          <Link to="/percorso">Torna al percorso</Link>
        </p>
      </div>
    )
  }
  // La key azzera video selezionato e finestre aperte quando si passa a un'altra lezione
  return <LessonView key={lesson.id} lesson={lesson} />
}

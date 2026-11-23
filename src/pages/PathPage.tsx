import { Link } from 'react-router-dom'
import { lessonsById, path } from '../content/index.ts'
import type { Stage } from '../content/schema.ts'
import { STATUS_LABELS, stageStats, statusOf } from '../logic/progress.ts'
import { useAppStore } from '../store/useAppStore.ts'
import ui from '../ui.module.css'
import styles from './PathPage.module.css'

function StageCard({ stage, number }: { stage: Stage; number?: number }) {
  const progress = useAppStore((state) => state.progress)
  const { total, done } = stageStats(stage, progress)
  const headingId = `stage-${stage.id}`

  return (
    <section className={ui.card} aria-labelledby={headingId}>
      <div className={ui.spread}>
        <h3 id={headingId} className={ui.sectionTitle}>
          {number !== undefined && `${number}. `}
          {stage.title}
        </h3>
        {total > 0 && (
          <span className={ui.muted}>
            {done}/{total}
          </span>
        )}
      </div>
      <p className={ui.muted}>{stage.description}</p>

      {total === 0 ? (
        <p className={ui.muted}>Lezioni in arrivo.</p>
      ) : (
        <>
          <div
            className={ui.progressTrack}
            role="progressbar"
            aria-label={`Avanzamento: ${stage.title}`}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={done}
          >
            <div className={ui.progressFill} style={{ width: `${(done / total) * 100}%` }} />
          </div>
          <ul className={ui.list}>
            {stage.lessonIds.map((id) => {
              const lesson = lessonsById.get(id)
              if (!lesson) return null
              const status = statusOf(progress, id)
              return (
                <li key={id} className={styles.lesson}>
                  <span className={`${styles.dot} ${styles[status]}`} aria-hidden="true" />
                  <div className={styles.lessonText}>
                    <Link to={`/lezione/${id}`}>{lesson.title}</Link>
                    <span className={ui.muted}>{STATUS_LABELS[status]}</span>
                  </div>
                  {lesson.draft && <span className={ui.badgeAccent}>Bozza</span>}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}

export function PathPage() {
  const coreStages = path.stages.filter((stage) => stage.kind === 'core')
  const extraStages = path.stages.filter((stage) => stage.kind === 'extra' && stage.lessonIds.length > 0)

  return (
    <div className={ui.page}>
      <header>
        <h1 className={ui.title}>Percorso</h1>
        <p className={ui.muted}>L'ordine è consigliato, non obbligatorio: puoi aprire qualsiasi lezione.</p>
      </header>

      <section className={ui.stack} aria-labelledby="path-core">
        <h2 id="path-core" className={ui.sectionTitle}>
          Tappe
        </h2>
        {coreStages.map((stage, index) => (
          <StageCard key={stage.id} stage={stage} number={index + 1} />
        ))}
      </section>

      {extraStages.length > 0 && (
        <section className={ui.stack} aria-labelledby="path-extra">
          <h2 id="path-extra" className={ui.sectionTitle}>
            Approfondimenti
          </h2>
          {extraStages.map((stage) => (
            <StageCard key={stage.id} stage={stage} />
          ))}
        </section>
      )}
    </div>
  )
}

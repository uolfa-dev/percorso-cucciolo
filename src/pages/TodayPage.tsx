import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EntryDialog } from '../components/EntryDialog.tsx'
import { lessonsById, modulesById, path } from '../content/index.ts'
import { formatDay, toLocalIsoDate } from '../logic/format.ts'
import { weekStats } from '../logic/progress.ts'
import { suggestToday, type Suggestion } from '../logic/suggestToday.ts'
import { useAppStore } from '../store/useAppStore.ts'
import ui from '../ui.module.css'

const REASON_LABELS: Record<Suggestion['reason'], string> = {
  'in-progress': 'In corso',
  new: 'Nuova',
  review: 'Ripasso',
}

export function TodayPage() {
  const progress = useAppStore((state) => state.progress)
  const diary = useAppStore((state) => state.diary)
  const dogName = useAppStore((state) => state.settings.dogName)
  const [sessionLessonId, setSessionLessonId] = useState<string | null>(null)

  const today = toLocalIsoDate(new Date())
  const suggestions = useMemo(
    () => suggestToday({ path, lessons: lessonsById, progress, diary }),
    [progress, diary],
  )
  const week = weekStats(diary, today)

  return (
    <div className={ui.page}>
      <header>
        <h1 className={ui.title}>Oggi{dogName && ` con ${dogName}`}</h1>
        <p className={ui.muted}>{formatDay(today)}</p>
      </header>

      <section className={ui.stack} aria-labelledby="today-suggestions">
        <h2 id="today-suggestions" className={ui.sectionTitle}>
          Sessioni consigliate
        </h2>
        {suggestions.length === 0 && (
          <p className={ui.card}>
            Per oggi non c'è nulla da proporre. Scegli una lezione dal <Link to="/percorso">percorso</Link>.
          </p>
        )}
        {suggestions.map(({ lessonId, reason }) => {
          const lesson = lessonsById.get(lessonId)
          if (!lesson) return null
          return (
            <article key={lessonId} className={ui.card}>
              <div className={ui.row}>
                <span className={reason === 'review' ? ui.badgeAccent : ui.badge}>{REASON_LABELS[reason]}</span>
                <span className={ui.muted}>
                  {modulesById.get(lesson.moduleId)?.title} · {lesson.sessionMinutes} min
                </span>
              </div>
              <Link className={ui.cardLink} to={`/lezione/${lesson.id}`}>
                {lesson.title}
              </Link>
              <p className={ui.muted}>{lesson.goal}</p>
              <div>
                <button type="button" className={ui.buttonPrimary} onClick={() => setSessionLessonId(lesson.id)}>
                  Registra sessione
                </button>
              </div>
            </article>
          )
        })}
      </section>

      <section className={ui.card} aria-labelledby="today-week">
        <h2 id="today-week" className={ui.sectionTitle}>
          Questa settimana
        </h2>
        <p>
          {week.sessions} {week.sessions === 1 ? 'sessione' : 'sessioni'} · {week.minutes}{' '}
          {week.minutes === 1 ? 'minuto' : 'minuti'}
        </p>
      </section>

      {sessionLessonId && <EntryDialog lessonId={sessionLessonId} onClose={() => setSessionLessonId(null)} />}
    </div>
  )
}

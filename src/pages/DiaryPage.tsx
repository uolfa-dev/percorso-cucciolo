import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EntryDialog } from '../components/EntryDialog.tsx'
import { lessonsById } from '../content/index.ts'
import type { DiaryEntry } from '../content/schema.ts'
import { formatDay } from '../logic/format.ts'
import { useAppStore } from '../store/useAppStore.ts'
import ui from '../ui.module.css'

function entryTitle(entry: DiaryEntry) {
  const lesson = entry.lessonId && lessonsById.get(entry.lessonId)
  if (lesson) {
    return (
      <Link className={ui.cardLink} to={`/lezione/${lesson.id}`}>
        {lesson.title}
      </Link>
    )
  }
  return <span className={ui.cardLink}>{entry.lessonId ? 'Lezione non più disponibile' : 'Nota libera'}</span>
}

export function DiaryPage() {
  const diary = useAppStore((state) => state.diary)
  const deleteEntry = useAppStore((state) => state.deleteEntry)
  const [dialog, setDialog] = useState<{ entry?: DiaryEntry } | null>(null)

  const sortKey = (entry: DiaryEntry) => `${entry.date} ${entry.createdAt}`
  const days: { date: string; entries: DiaryEntry[] }[] = []
  for (const entry of diary.toSorted((a, b) => (sortKey(a) < sortKey(b) ? 1 : -1))) {
    const day = days.at(-1)
    if (day?.date === entry.date) day.entries.push(entry)
    else days.push({ date: entry.date, entries: [entry] })
  }

  return (
    <div className={ui.page}>
      <header className={ui.spread}>
        <h1 className={ui.title}>Diario</h1>
        <button type="button" className={ui.buttonPrimary} onClick={() => setDialog({})}>
          Aggiungi voce
        </button>
      </header>

      {days.length === 0 && (
        <p className={ui.card}>Il diario è vuoto. Registra una sessione da una lezione oppure aggiungi una nota.</p>
      )}

      {days.map(({ date, entries }) => (
        <section key={date} className={ui.stack} aria-label={formatDay(date)}>
          <h2 className={ui.sectionTitle}>{formatDay(date)}</h2>
          {entries.map((entry) => (
            <article key={entry.id} className={ui.card}>
              {entryTitle(entry)}
              {(entry.minutes !== undefined || entry.rating !== undefined) && (
                <p className={ui.muted}>
                  {[
                    entry.minutes !== undefined && `${entry.minutes} min`,
                    entry.rating !== undefined && `voto ${entry.rating}/5`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}
              {entry.notes && <p className={ui.preserve}>{entry.notes}</p>}
              <div className={ui.row}>
                <button type="button" className={ui.button} onClick={() => setDialog({ entry })}>
                  Modifica
                </button>
                <button
                  type="button"
                  className={ui.buttonDanger}
                  onClick={() => window.confirm('Eliminare questa voce del diario?') && deleteEntry(entry.id)}
                >
                  Elimina
                </button>
              </div>
            </article>
          ))}
        </section>
      ))}

      {dialog && <EntryDialog key={dialog.entry?.id} entry={dialog.entry} onClose={() => setDialog(null)} />}
    </div>
  )
}

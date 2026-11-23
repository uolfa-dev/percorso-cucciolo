import { useEffect, useRef, useState, type FormEvent } from 'react'
import { lessonsById, path } from '../content/index.ts'
import type { DiaryEntry } from '../content/schema.ts'
import { toLocalIsoDate } from '../logic/format.ts'
import { useAppStore, type EntryInput } from '../store/useAppStore.ts'
import ui from '../ui.module.css'
import styles from './EntryDialog.module.css'

type Props = {
  // Voce da modificare; se manca ne viene creata una nuova
  entry?: DiaryEntry
  lessonId?: string
  onClose: () => void
}

const RATINGS = [1, 2, 3, 4, 5]

export function EntryDialog({ entry, lessonId: presetLessonId, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const addEntry = useAppStore((state) => state.addEntry)
  const updateEntry = useAppStore((state) => state.updateEntry)

  const [date, setDate] = useState(entry?.date ?? toLocalIsoDate(new Date()))
  const [lessonId, setLessonId] = useState(entry?.lessonId ?? presetLessonId ?? '')
  const [minutes, setMinutes] = useState(entry?.minutes?.toString() ?? '')
  const [rating, setRating] = useState(entry?.rating)
  const [notes, setNotes] = useState(entry?.notes ?? '')

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const input: EntryInput = { date, notes: notes.trim() }
    if (lessonId) input.lessonId = lessonId
    if (minutes) input.minutes = Number(minutes)
    if (rating) input.rating = rating
    if (entry) updateEntry(entry.id, input)
    else addEntry(input)
    onClose()
  }

  return (
    <dialog ref={dialogRef} className={styles.dialog} onClose={onClose} aria-labelledby="entry-dialog-title">
      <form className={styles.form} onSubmit={handleSubmit}>
        <h2 id="entry-dialog-title" className={ui.sectionTitle}>
          {entry ? 'Modifica voce' : 'Registra sessione'}
        </h2>

        <label className={ui.field}>
          Data
          <input className={ui.input} type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </label>

        <label className={ui.field}>
          Lezione
          <select className={ui.input} value={lessonId} onChange={(e) => setLessonId(e.target.value)}>
            <option value="">Nessuna (nota libera)</option>
            {lessonId && !lessonsById.has(lessonId) && <option value={lessonId}>Lezione non più disponibile</option>}
            {path.stages
              .filter((stage) => stage.lessonIds.length > 0)
              .map((stage) => (
                <optgroup key={stage.id} label={stage.title}>
                  {stage.lessonIds.map((id) => (
                    <option key={id} value={id}>
                      {lessonsById.get(id)?.title}
                    </option>
                  ))}
                </optgroup>
              ))}
          </select>
        </label>

        <label className={ui.field}>
          Minuti
          <input
            className={ui.input}
            type="number"
            inputMode="numeric"
            min={1}
            max={600}
            step={1}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
        </label>

        <fieldset className={ui.field}>
          <legend>Com'è andata?</legend>
          <div className={styles.ratings}>
            {RATINGS.map((value) => (
              <label key={value} className={styles.rating}>
                <input
                  type="radio"
                  name="rating"
                  value={value}
                  checked={rating === value}
                  onChange={() => setRating(value)}
                  // Un secondo tocco sul voto scelto lo toglie: il voto è facoltativo
                  onClick={() => rating === value && setRating(undefined)}
                />
                <span>{value}</span>
              </label>
            ))}
          </div>
          <span className={ui.muted}>1 = faticosa, 5 = benissimo</span>
        </fieldset>

        <label className={ui.field}>
          Note
          <textarea
            className={ui.input}
            rows={4}
            maxLength={4000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        <div className={styles.actions}>
          <button type="button" className={ui.button} onClick={onClose}>
            Annulla
          </button>
          <button type="submit" className={ui.buttonPrimary}>
            Salva
          </button>
        </div>
      </form>
    </dialog>
  )
}

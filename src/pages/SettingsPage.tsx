import { useRef, useState, type ChangeEvent } from 'react'
import { createBackup, parseBackup } from '../logic/backup.ts'
import { toLocalIsoDate } from '../logic/format.ts'
import { useAppStore } from '../store/useAppStore.ts'
import ui from '../ui.module.css'

export function SettingsPage() {
  const dogName = useAppStore((state) => state.settings.dogName)
  const setDogName = useAppStore((state) => state.setDogName)
  const replaceData = useAppStore((state) => state.replaceData)
  const resetData = useAppStore((state) => state.resetData)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null)

  function exportBackup() {
    const { progress, diary, settings } = useAppStore.getState()
    const backup = createBackup({ progress, diary, settings })
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `percorso-cucciolo-${toLocalIsoDate(new Date())}.json`
    link.click()
    // Alcuni browser annullano il download se l'URL viene revocato subito
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Permette di riscegliere lo stesso file dopo un errore
    event.target.value = ''
    if (!file) return
    const result = parseBackup(await file.text())
    if (!result.ok) {
      setMessage({ error: true, text: `Backup non valido, nessun dato modificato.\n${result.error}` })
      return
    }
    const { diary, progress } = result.data
    const summary = `voci di diario: ${diary.length}, lezioni con progressi: ${Object.keys(progress).length}`
    if (!window.confirm(`Sostituire tutti i dati di questo dispositivo con il backup (${summary})?`)) return
    replaceData(result.data)
    setMessage({ error: false, text: `Backup importato (${summary}).` })
  }

  function reset() {
    if (!window.confirm('Cancellare progressi, diario e impostazioni da questo dispositivo? Non si può annullare.')) return
    resetData()
    setMessage({ error: false, text: 'Dati azzerati.' })
  }

  return (
    <div className={ui.page}>
      <h1 className={ui.title}>Impostazioni</h1>

      <section className={ui.card} aria-labelledby="settings-dog">
        <h2 id="settings-dog" className={ui.sectionTitle}>
          Il tuo cane
        </h2>
        <label className={ui.field}>
          Nome
          <input
            className={ui.input}
            type="text"
            maxLength={40}
            autoComplete="off"
            value={dogName}
            onChange={(e) => setDogName(e.target.value)}
          />
        </label>
      </section>

      <section className={ui.card} aria-labelledby="settings-data">
        <h2 id="settings-data" className={ui.sectionTitle}>
          Dati
        </h2>
        <p className={ui.muted}>
          Progressi e diario restano solo su questo dispositivo. Esporta un backup ogni tanto: serve anche per portare
          i dati su un altro telefono.
        </p>
        <div className={ui.row}>
          <button type="button" className={ui.button} onClick={exportBackup}>
            Esporta backup
          </button>
          <button type="button" className={ui.button} onClick={() => fileInputRef.current?.click()}>
            Importa backup
          </button>
          <button type="button" className={ui.buttonDanger} onClick={reset}>
            Azzera dati
          </button>
          <input ref={fileInputRef} type="file" accept="application/json,.json" hidden onChange={importBackup} />
        </div>
        {message && (
          <p className={message.error ? ui.error : ui.notice} role={message.error ? 'alert' : 'status'}>
            {message.text}
          </p>
        )}
      </section>

      <section className={ui.card} aria-labelledby="settings-credits">
        <h2 id="settings-credits" className={ui.sectionTitle}>
          Crediti
        </h2>
        <p>
          Le lezioni sono riassunti originali dei video gratuiti del canale YouTube{' '}
          <a href="https://www.youtube.com/@kikopup" target="_blank" rel="noopener noreferrer">
            Kikopup
          </a>{' '}
          di Emily Larlham (
          <a href="https://dogmantics.com/" target="_blank" rel="noopener noreferrer">
            Dogmantics
          </a>
          ). Ogni lezione rimanda ai video da cui è tratta.
        </p>
        <p className={ui.muted}>
          Progetto personale non ufficiale, non affiliato a Emily Larlham né a Dogmantics.
        </p>
      </section>
    </div>
  )
}

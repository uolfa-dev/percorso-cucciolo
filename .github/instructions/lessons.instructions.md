---
description: Regole per scrivere e rivedere le lezioni di content/lessons a partire dalle trascrizioni dei video Kikopup
applyTo: "content/**"
---

# Scrivere le lezioni

Le lezioni sono schede originali in italiano tratte dai tutorial del canale YouTube Kikopup (Emily Larlham). Sito e repository sono pubblici: le trascrizioni restano in `data/` e non vanno mai copiate nel repo.

## Fonti

- Leggi per intero `data/transcripts/<videoId>.md` di ogni video che citi, descrizione e capitoli compresi. Se il file manca, esegui `npm run ingest` e `npm run transcripts`: non scrivere a memoria.
- Riporta solo tecniche, criteri e avvertenze che l'autrice dà in quei video. Nel dubbio ometti. Niente consigli presi altrove.
- Scrivi istruzioni sintetiche con parole tue: mai tradurre o parafrasare da vicino la trascrizione, al massimo una frase breve citata. La dimostrazione resta nel video.
- I sottotitoli automatici sbagliano nomi e termini: se un passaggio non è chiaro, non usarlo.

## Che cosa diventa una lezione

- Una lezione è un esercizio che si può insegnare in una serie di sessioni.
- Più video sullo stesso esercizio diventano una lezione con più `videos`. Una serie in più parti diventa più lezioni collegate da `prerequisites`.
- Un video di soli principi diventa una lezione solo se se ne ricavano almeno 3 passi pratici; altrimenti aggancialo come video aggiuntivo alla lezione più vicina.
- Un video senza trascrizione si aggancia come video aggiuntivo se titolo e descrizione identificano l'esercizio; altrimenti si esclude in `content/catalog/assignments.json` con motivo `senza-trascrizione`.

## File e campi

Il file è `content/lessons/<moduleId>/<id>.json`, con lo schema `LessonSchema` di `src/content/schema.ts`. Ogni lezione compare in una sola tappa di `content/path.json`.

| Campo | Regola |
|---|---|
| `id` | Kebab-case, uguale al nome del file: il nome italiano dell'esercizio. |
| `title` | Nome dell'esercizio, senza maiuscole enfatiche né punti esclamativi. |
| `summary` | Al massimo 2 frasi: che cosa impara il cane e a che cosa serve. |
| `goal` | Una frase: il comportamento osservabile a fine lezione. |
| `prerequisites` | Solo lezioni che il video dà per acquisite. Una lezione delle tappe `core` non può dipendere da una `extra`. |
| `equipment` | Solo ciò che si usa nel video. |
| `sessionMinutes` | La durata indicata nel video; se non la indica, 5. |
| `steps` | Da 3 a 8, in ordine di esecuzione: una frase all'imperativo, seconda persona singolare. |
| `criteria` | Il criterio dell'autrice per passare oltre; se non lo dà, il risultato dell'ultimo passo. |
| `mistakes` | Gli errori che l'autrice segnala; lista vuota se non ne segnala. |
| `safetyNote` | Le avvertenze dell'autrice (per esempio rivolgersi a un professionista in caso di aggressività), solo se presenti. |
| `videos` | Il primo è il video principale; gli altri hanno una `label` in italiano che dice che cosa aggiungono. |
| `draft` | `true` solo per una scheda non ancora verificata sulla trascrizione. |

## Minutaggi

Ogni passo spiegato nel video ha `videoId` e `startSec`. `startSec` è il marcatore `[mm:ss]` del paragrafo della trascrizione in cui inizia quella spiegazione, convertito in secondi. Non stimare: se non trovi il punto, ometti entrambi i campi.

## Lingua

- Dai del tu. Frasi brevi, niente punti esclamativi né superlativi.
- Usa i termini di `content/glossary.json`: «segnale», mai «comando».
- Scrivi i segnali vocali tra virgolette basse («lascia») e non usare l'inglese quando il glossario ha il termine italiano.

## Dopo aver scritto

1. Aggiungi l'id della lezione alla tappa giusta di `content/path.json`.
2. Se un video è nel modulo sbagliato o va escluso, correggi `content/catalog/assignments.json`.
3. Esegui `npm run content:validate` e `npm run content:coverage`.

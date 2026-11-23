import { renderToString } from 'react-dom/server'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { routes } from './routes.tsx'

function render(url: string): string {
  return renderToString(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [url] })} />)
}

describe('pagine', () => {
  it.each([
    ['/', 'Sessioni consigliate'],
    ['/percorso', 'Ripartire dalle basi giuste'],
    ['/lezione/segnale-di-rilascio', 'Quando passare oltre'],
    ['/lezione/rilascio-da-cuccia-e-divano', 'Prima di questa lezione'],
    ['/lezione/inesistente', 'Lezione non trovata'],
    ['/diario', 'Il diario è vuoto'],
    ['/impostazioni', 'non affiliato'],
    ['/altro', 'Pagina non trovata'],
  ])('%s si disegna con i contenuti reali', (url, text) => {
    expect(render(url)).toContain(text)
  })
})

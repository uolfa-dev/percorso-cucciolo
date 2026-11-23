import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Percorsi relativi: la stessa build funziona sotto qualsiasi sottocartella (GitHub Pages).
  base: './',
  plugins: [
    react(),
    VitePWA({
      // Il nuovo service worker subentra da solo; la versione aggiornata si vede alla riapertura dell'app
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Percorso Cucciolo',
        short_name: 'Percorso',
        description: 'Percorso guidato e diario di addestramento del cucciolo, dai video di Kikopup.',
        lang: 'it',
        start_url: './',
        scope: './',
        display: 'standalone',
        theme_color: '#2f6f5e',
        background_color: '#f7f4ee',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts'],
  },
})

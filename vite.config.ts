import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Percorsi relativi: la stessa build funziona sotto qualsiasi sottocartella (GitHub Pages).
  base: './',
  plugins: [react()],
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
  },
})

import { vi } from 'vitest'

// I test girano in Node: lo store salva su un localStorage in memoria
const data = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (key: string) => data.get(key) ?? null,
  setItem: (key: string, value: string) => void data.set(key, value),
  removeItem: (key: string) => void data.delete(key),
})

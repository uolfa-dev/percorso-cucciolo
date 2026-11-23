import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { DiaryEntry, LessonProgress, LessonStatus, Settings } from '../content/schema.ts'

// localStorage è condiviso da tutti i siti dello stesso dominio (es. utente.github.io): serve un prefisso
export const STORAGE_KEY = 'percorso-cucciolo/state'

export type AppData = {
  progress: Record<string, LessonProgress>
  diary: DiaryEntry[]
  settings: Settings
}

export type EntryInput = Omit<DiaryEntry, 'id' | 'createdAt'>

type AppActions = {
  setStatus: (lessonId: string, status: LessonStatus) => void
  toggleStep: (lessonId: string, stepIndex: number) => void
  addEntry: (input: EntryInput) => void
  updateEntry: (id: string, input: EntryInput) => void
  deleteEntry: (id: string) => void
  setDogName: (dogName: string) => void
  replaceData: (data: AppData) => void
  resetData: () => void
}

function emptyData(): AppData {
  return { progress: {}, diary: [], settings: { dogName: '' } }
}

// crypto.randomUUID non esiste fuori da HTTPS/localhost (es. anteprima in rete locale)
function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

// Una sessione registrata su una lezione mai iniziata la porta "in corso"
function startLesson(progress: AppData['progress'], lessonId: string | undefined): AppData['progress'] {
  if (!lessonId || (progress[lessonId]?.status ?? 'todo') !== 'todo') return progress
  return { ...progress, [lessonId]: { status: 'in-progress', checkedSteps: progress[lessonId]?.checkedSteps ?? [] } }
}

export const useAppStore = create<AppData & AppActions>()(
  persist(
    (set) => ({
      ...emptyData(),

      setStatus: (lessonId, status) =>
        set((state) => ({
          progress: {
            ...state.progress,
            [lessonId]: { status, checkedSteps: state.progress[lessonId]?.checkedSteps ?? [] },
          },
        })),

      toggleStep: (lessonId, stepIndex) =>
        set((state) => {
          const current = state.progress[lessonId] ?? { status: 'todo', checkedSteps: [] }
          const checkedSteps = current.checkedSteps.includes(stepIndex)
            ? current.checkedSteps.filter((index) => index !== stepIndex)
            : [...current.checkedSteps, stepIndex].sort((a, b) => a - b)
          return { progress: { ...state.progress, [lessonId]: { ...current, checkedSteps } } }
        }),

      addEntry: (input) =>
        set((state) => ({
          diary: [...state.diary, { ...input, id: newId(), createdAt: new Date().toISOString() }],
          progress: startLesson(state.progress, input.lessonId),
        })),

      updateEntry: (id, input) =>
        set((state) => ({
          diary: state.diary.map((entry) => (entry.id === id ? { ...input, id, createdAt: entry.createdAt } : entry)),
          progress: startLesson(state.progress, input.lessonId),
        })),

      deleteEntry: (id) => set((state) => ({ diary: state.diary.filter((entry) => entry.id !== id) })),

      setDogName: (dogName) => set({ settings: { dogName } }),

      replaceData: (data) => set(data),

      resetData: () => set(emptyData()),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ progress, diary, settings }) => ({ progress, diary, settings }),
    },
  ),
)

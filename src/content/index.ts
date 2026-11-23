import videosJson from '../../content/catalog/videos.json'
import modulesJson from '../../content/modules.json'
import pathJson from '../../content/path.json'
import type { Lesson, Module, Path, Video } from './schema.ts'

// I JSON sono già validati da "npm run content:validate" prima di ogni build
const lessonFiles = import.meta.glob<Lesson>('../../content/lessons/*/*.json', { eager: true, import: 'default' })

export const path = pathJson as Path

export const lessonsById: ReadonlyMap<string, Lesson> = new Map(
  Object.values(lessonFiles).map((lesson) => [lesson.id, lesson]),
)

export const modulesById: ReadonlyMap<string, Module> = new Map(
  (modulesJson as Module[]).map((module) => [module.id, module]),
)

export const videosById: ReadonlyMap<string, Video> = new Map(
  (videosJson as Video[]).map((video) => [video.id, video]),
)

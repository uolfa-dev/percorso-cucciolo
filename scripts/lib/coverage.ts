import type { Video } from '../../src/content/schema.ts'
import type { Content } from './content-checks.ts'

export type CoverageStatus = 'coperto' | 'escluso' | 'in sospeso'

export type CoverageRow = {
  video: Video
  moduleId: string | null
  status: CoverageStatus
  exclusion: string | null
}

export function computeCoverage(content: Content): CoverageRow[] {
  // Le bozze non contano: un video è coperto solo da una lezione verificata sulla trascrizione
  const covered = new Set(content.lessons.filter((l) => !l.draft).flatMap((l) => l.videos.map((v) => v.videoId)))
  return content.videos
    .filter((video) => video.kind === 'tutorial')
    .map((video) => {
      const assignment = content.assignments[video.id]
      const exclusion = assignment && 'exclude' in assignment ? assignment.exclude : null
      return {
        video,
        moduleId: assignment && 'module' in assignment ? assignment.module : null,
        status: covered.has(video.id) ? 'coperto' : exclusion ? 'escluso' : 'in sospeso',
        exclusion,
      }
    })
}

import { checkContent } from './lib/content-checks.ts'
import { loadRawContent } from './lib/load-content.ts'

const { errors, content } = checkContent(loadRawContent())
if (errors.length > 0 || !content) {
  console.error(errors.join('\n'))
  console.error(`\nContenuti non validi: ${errors.length} errori.`)
  process.exit(1)
}

const drafts = content.lessons.filter((lesson) => lesson.draft).length
console.log(
  `Contenuti validi: ${content.lessons.length} lezioni (${drafts} bozze), ${content.modules.length} moduli, ` +
    `${content.path.stages.length} tappe, ${content.videos.length} video in catalogo.`,
)

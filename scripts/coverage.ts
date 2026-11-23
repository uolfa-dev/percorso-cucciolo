import { parseArgs } from 'node:util'
import { checkContent } from './lib/content-checks.ts'
import { computeCoverage, type CoverageRow } from './lib/coverage.ts'
import { loadRawContent } from './lib/load-content.ts'

const { values: options } = parseArgs({
  options: {
    // Esce con errore se resta anche un solo tutorial in sospeso
    strict: { type: 'boolean', default: false },
    // Elenca ogni tutorial con il suo stato
    list: { type: 'boolean', default: false },
  },
})

const { errors, content } = checkContent(loadRawContent())
if (errors.length > 0 || !content) {
  console.error(`Contenuti non validi (${errors.length} errori): esegui prima "npm run content:validate".`)
  process.exit(1)
}

const rows = computeCoverage(content)
const count = (list: CoverageRow[], status: CoverageRow['status']) => list.filter((r) => r.status === status).length
const pending = count(rows, 'in sospeso')
console.log(
  `Tutorial: ${rows.length} | coperti: ${count(rows, 'coperto')} | esclusi: ${count(rows, 'escluso')} | in sospeso: ${pending}`,
)

const groups: { title: string; rows: CoverageRow[] }[] = [
  ...content.modules
    .toSorted((a, b) => a.order - b.order)
    .map((module) => ({
      title: `${module.id} (${module.title})`,
      rows: rows.filter((r) => r.moduleId === module.id && r.status !== 'escluso'),
    })),
  { title: '(non assegnati)', rows: rows.filter((r) => r.moduleId === null && r.status !== 'escluso') },
  { title: '(esclusi)', rows: rows.filter((r) => r.status === 'escluso') },
]

for (const group of groups) {
  if (group.rows.length === 0) continue
  console.log(
    `\n${group.title}: ${group.rows.length} tutorial, ${count(group.rows, 'coperto')} coperti, ` +
      `${count(group.rows, 'in sospeso')} in sospeso`,
  )
  if (!options.list) continue
  for (const { video, status, exclusion } of group.rows) {
    console.log(`  [${exclusion ?? status}] ${video.id}  ${video.title}`)
  }
}

if (options.strict && pending > 0) {
  console.error(`\nCopertura incompleta: ${pending} tutorial in sospeso.`)
  process.exit(1)
}

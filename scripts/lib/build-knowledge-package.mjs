#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'
import { parseReferences } from './parse-references.mjs'

const ROOT = process.env.BOOXTRA_ROOT
  ? resolve(process.env.BOOXTRA_ROOT)
  : resolve(fileURLToPath(new URL('../..', import.meta.url)))

const OUT = join(ROOT, 'dist', 'knowledge')
mkdirSync(OUT, { recursive: true })

const index = parseReferences(join(ROOT, 'references'))

writeFileSync(join(OUT, 'index.json'), JSON.stringify(index, null, 2) + '\n')

for (const entry of index) {
  const raw = readFileSync(join(ROOT, 'references', entry.file), 'utf8')
  const { content } = matter(raw)
  writeFileSync(join(OUT, entry.file), content.trimStart())
}

writeFileSync(
  join(OUT, 'base-prompt.md'),
  readFileSync(join(ROOT, 'base-prompt.md'), 'utf8')
)

const { version } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
writeFileSync(
  join(OUT, 'package.json'),
  JSON.stringify({
    name: '@booxtra/knowledge',
    version,
    description: 'Booxtra knowledge base — references and base prompt for MCP server',
    private: false,
    files: ['index.json', '*.md'],
    main: 'index.json',
  }, null, 2) + '\n'
)

console.log(`Built @booxtra/knowledge@${version} → dist/knowledge/ (${index.length} references)`)

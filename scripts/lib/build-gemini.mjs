#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'
import { parseReferences } from './parse-references.mjs'

const ROOT = process.env.BOOXTRA_ROOT
  ? resolve(process.env.BOOXTRA_ROOT)
  : resolve(fileURLToPath(new URL('../..', import.meta.url)))

const { version } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const refs = parseReferences(join(ROOT, 'references'))

const OUT = join(ROOT, 'dist', 'gemini-extension')
rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

// Extension manifest (with version injected)
const extJson = JSON.parse(readFileSync(join(ROOT, 'targets/gemini/gemini-extension.json'), 'utf8'))
extJson.version = version
writeFileSync(join(OUT, 'gemini-extension.json'), JSON.stringify(extJson, null, 2) + '\n')

// GEMINI.md: routing skill + all references (frontmatter stripped), separated by ---
const sections = []
sections.push(readFileSync(join(ROOT, 'skills/routing/SKILL.md'), 'utf8').trim())
sections.push('')

for (const entry of refs) {
  const { content } = matter(readFileSync(join(ROOT, 'references', entry.file), 'utf8'))
  sections.push('---')
  sections.push('')
  sections.push(content.trim())
  sections.push('')
}

writeFileSync(join(OUT, 'GEMINI.md'), sections.join('\n') + '\n')

console.log(`Built gemini-extension@${version} → dist/gemini-extension/ (${refs.length} references)`)

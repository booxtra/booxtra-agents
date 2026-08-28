#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import matter from 'gray-matter'
import { parseReferences } from './parse-references.mjs'

const ROOT = process.env.BOOXTRA_ROOT
  ? resolve(process.env.BOOXTRA_ROOT)
  : resolve(fileURLToPath(new URL('../..', import.meta.url)))

const { version } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const refs = parseReferences(join(ROOT, 'references'))

const OUT = join(ROOT, 'dist', 'booxtra.plugin')
rmSync(OUT, { recursive: true, force: true })

// Plugin manifest (with version injected)
mkdirSync(join(OUT, '.claude-plugin'), { recursive: true })
const pluginJson = JSON.parse(readFileSync(join(ROOT, 'targets/claude/plugin.json'), 'utf8'))
pluginJson.version = version
writeFileSync(join(OUT, '.claude-plugin', 'plugin.json'), JSON.stringify(pluginJson, null, 2) + '\n')

// MCP server config
writeFileSync(join(OUT, '.mcp.json'), readFileSync(join(ROOT, 'targets/claude/mcp.json'), 'utf8'))

// Skills
const SKILLS = ['routing', 'onboarding', 'bokforing', 'regler', 'rapporter', 'avslut-och-export', 'fakturering']
for (const skill of SKILLS) {
  mkdirSync(join(OUT, 'skills', skill), { recursive: true })
  writeFileSync(
    join(OUT, 'skills', skill, 'SKILL.md'),
    readFileSync(join(ROOT, 'skills', skill, 'SKILL.md'), 'utf8')
  )
}

// Reference files under skills/regler/references/ (frontmatter stripped)
const refsOut = join(OUT, 'skills', 'regler', 'references')
mkdirSync(refsOut, { recursive: true })
for (const entry of refs) {
  const { content } = matter(readFileSync(join(ROOT, 'references', entry.file), 'utf8'))
  writeFileSync(join(refsOut, entry.file), content.trimStart())
}

console.log(`Built booxtra.plugin@${version} → dist/booxtra.plugin/ (${refs.length} references)`)

// Zip (contents flat — no wrapping directory)
const ZIP = join(ROOT, 'dist', 'booxtra.plugin.zip')
rmSync(ZIP, { force: true })
execSync(`cd "${OUT}" && zip -r "${ZIP}" .`, { stdio: 'inherit' })
console.log(`Zipped → dist/booxtra.plugin.zip`)

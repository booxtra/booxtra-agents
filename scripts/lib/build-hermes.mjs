#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync } from 'node:fs'
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

const OUT = join(ROOT, 'dist', 'booxtra-hermes')
rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

// plugin.yaml with version injected
const pluginYaml = readFileSync(join(ROOT, 'targets/hermes/plugin.yaml'), 'utf8')
  .replace('{{VERSION}}', version)
writeFileSync(join(OUT, 'plugin.yaml'), pluginYaml)

// Python source files
for (const f of ['__init__.py', 'hooks.py', 'config.example.yaml']) {
  copyFileSync(join(ROOT, 'targets/hermes', f), join(OUT, f))
}

// Skills
const SKILLS = ['routing', 'onboarding', 'bokforing', 'regler', 'rapporter', 'avslut-och-export', 'fakturering']
for (const skill of SKILLS) {
  mkdirSync(join(OUT, 'skills', skill), { recursive: true })
  copyFileSync(join(ROOT, 'skills', skill, 'SKILL.md'), join(OUT, 'skills', skill, 'SKILL.md'))
}

// References (frontmatter stripped) + index
const refsOut = join(OUT, 'references')
mkdirSync(refsOut, { recursive: true })
for (const entry of refs) {
  const { content } = matter(readFileSync(join(ROOT, 'references', entry.file), 'utf8'))
  writeFileSync(join(refsOut, entry.file), content.trimStart())
}
writeFileSync(join(refsOut, 'index.json'), JSON.stringify(refs, null, 2) + '\n')

// Package as tar.gz
const TAR = join(ROOT, 'dist', 'booxtra-hermes.tar.gz')
rmSync(TAR, { force: true })
execSync(`tar -czf "${TAR}" -C "${join(ROOT, 'dist')}" booxtra-hermes`, { stdio: 'inherit' })

console.log(`Built booxtra-hermes@${version} → dist/booxtra-hermes.tar.gz (${refs.length} references)`)

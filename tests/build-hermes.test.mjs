import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SCRIPT = join(ROOT, 'scripts/lib/build-hermes.mjs')
const TAR = join(ROOT, 'dist', 'booxtra-hermes.tar.gz')
const ROOT_PKG = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))

before(() => {
  execSync(`node "${SCRIPT}"`, { cwd: ROOT, encoding: 'utf8' })
})

test('dist/booxtra-hermes.tar.gz is created', () => {
  assert.ok(existsSync(TAR), 'booxtra-hermes.tar.gz missing')
})

test('plugin.yaml has version injected and no placeholder', () => {
  const content = execSync(`tar -xzOf "${TAR}" booxtra-hermes/plugin.yaml`, { encoding: 'utf8' })
  assert.ok(content.includes(ROOT_PKG.version), 'version not injected into plugin.yaml')
  assert.ok(!content.includes('{{VERSION}}'), '{{VERSION}} placeholder not replaced')
})

test('archive contains __init__.py, hooks.py, config.example.yaml', () => {
  const listing = execSync(`tar -tzf "${TAR}"`, { encoding: 'utf8' })
  assert.ok(listing.includes('booxtra-hermes/__init__.py'), '__init__.py missing')
  assert.ok(listing.includes('booxtra-hermes/hooks.py'), 'hooks.py missing')
  assert.ok(listing.includes('booxtra-hermes/config.example.yaml'), 'config.example.yaml missing')
})

test('archive contains all 7 skills', () => {
  const listing = execSync(`tar -tzf "${TAR}"`, { encoding: 'utf8' })
  const SKILLS = ['routing', 'onboarding', 'bokforing', 'regler', 'rapporter', 'avslut-och-export', 'fakturering']
  for (const skill of SKILLS) {
    assert.ok(listing.includes(`booxtra-hermes/skills/${skill}/SKILL.md`), `skills/${skill}/SKILL.md missing from archive`)
  }
})

test('archive contains references/index.json and all 4 reference files', () => {
  const listing = execSync(`tar -tzf "${TAR}"`, { encoding: 'utf8' })
  assert.ok(listing.includes('booxtra-hermes/references/index.json'), 'references/index.json missing')
  for (const file of ['moms.md', 'representation.md', 'eget-uttag.md', 'anlaggning-vs-forbrukning.md']) {
    assert.ok(listing.includes(`booxtra-hermes/references/${file}`), `references/${file} missing from archive`)
  }
})

test('reference files in archive have no frontmatter', () => {
  const content = execSync(`tar -xzOf "${TAR}" booxtra-hermes/references/moms.md`, { encoding: 'utf8' })
  assert.ok(!content.startsWith('---'), 'moms.md still has YAML frontmatter')
  assert.ok(content.trim().length > 0, 'moms.md is empty')
})

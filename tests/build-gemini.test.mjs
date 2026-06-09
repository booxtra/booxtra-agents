import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SCRIPT = join(ROOT, 'scripts/lib/build-gemini.mjs')
const DIST = join(ROOT, 'dist', 'gemini-extension')
const ROOT_PKG = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))

before(() => {
  execSync(`node "${SCRIPT}"`, { cwd: ROOT, encoding: 'utf8' })
})

test('gemini-extension.json has correct name, version, and contextFileName', () => {
  const extPath = join(DIST, 'gemini-extension.json')
  assert.ok(existsSync(extPath), 'gemini-extension.json missing')
  const ext = JSON.parse(readFileSync(extPath, 'utf8'))
  assert.equal(ext.name, 'booxtra')
  assert.equal(ext.contextFileName, 'GEMINI.md')
  assert.equal(ext.version, ROOT_PKG.version, 'version must match package.json')
})

test('GEMINI.md exists and contains routing skill content', () => {
  const geminiPath = join(DIST, 'GEMINI.md')
  assert.ok(existsSync(geminiPath), 'GEMINI.md missing')
  const content = readFileSync(geminiPath, 'utf8')
  assert.ok(content.includes('bokforing'), 'routing table missing from GEMINI.md')
  assert.ok(content.includes('regler'), 'routing table missing from GEMINI.md')
})

test('GEMINI.md contains content from all 4 reference files', () => {
  const content = readFileSync(join(DIST, 'GEMINI.md'), 'utf8')
  assert.ok(content.includes('Moms'), 'moms reference missing from GEMINI.md')
  assert.ok(content.includes('Representation'), 'representation reference missing from GEMINI.md')
  assert.ok(content.includes('eget uttag') || content.includes('Eget uttag') || content.includes('2010'), 'eget-uttag reference missing from GEMINI.md')
  assert.ok(content.includes('anläggningstillgång') || content.includes('1220'), 'anlaggning reference missing from GEMINI.md')
})

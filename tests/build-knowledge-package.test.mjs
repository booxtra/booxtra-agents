import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SCRIPT = join(ROOT, 'scripts/lib/build-knowledge-package.mjs')
const DIST = join(ROOT, 'dist', 'knowledge')

before(() => {
  execSync(`node "${SCRIPT}"`, { cwd: ROOT, encoding: 'utf8' })
})

test('dist/knowledge/index.json exists with 4 entries', () => {
  assert.ok(existsSync(join(DIST, 'index.json')), 'index.json missing')
  const index = JSON.parse(readFileSync(join(DIST, 'index.json'), 'utf8'))
  assert.equal(index.length, 4)
  const ids = index.map(e => e.id).sort()
  assert.deepEqual(ids, ['anlaggning-vs-forbrukning', 'eget-uttag', 'moms', 'representation'])
})

test('each reference exists in dist/knowledge/ with frontmatter stripped', () => {
  const index = JSON.parse(readFileSync(join(DIST, 'index.json'), 'utf8'))
  for (const entry of index) {
    const filePath = join(DIST, entry.file)
    assert.ok(existsSync(filePath), `${entry.file} missing from dist/knowledge/`)
    const content = readFileSync(filePath, 'utf8')
    assert.ok(!content.startsWith('---'), `${entry.file} still has YAML frontmatter`)
    assert.ok(content.trim().length > 0, `${entry.file} is empty`)
  }
})

test('dist/knowledge/base-prompt.md exists and contains search_knowledge', () => {
  const filePath = join(DIST, 'base-prompt.md')
  assert.ok(existsSync(filePath), 'base-prompt.md missing from dist/knowledge/')
  const content = readFileSync(filePath, 'utf8')
  assert.ok(content.includes('search_knowledge'), 'base-prompt must mention search_knowledge')
})

test('dist/knowledge/package.json has correct name, version, and is public', () => {
  const pkgPath = join(DIST, 'package.json')
  assert.ok(existsSync(pkgPath), 'package.json missing from dist/knowledge/')
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  assert.equal(pkg.name, '@booxtra/knowledge')
  assert.ok(typeof pkg.version === 'string' && pkg.version.length > 0, 'version must be a non-empty string')
  assert.strictEqual(pkg.private, false)
})

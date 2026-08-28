import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const VALIDATE = join(__dirname, '../scripts/validate.mjs')
const FIXTURES = join(__dirname, 'fixtures')

function run(fixture) {
  try {
    const stdout = execSync(`node "${VALIDATE}"`, {
      env: { ...process.env, BOOXTRA_ROOT: join(FIXTURES, fixture) },
      encoding: 'utf8',
    })
    return { code: 0, out: stdout }
  } catch (e) {
    return { code: e.status ?? 1, out: (e.stderr ?? '') + (e.stdout ?? '') }
  }
}

test('valid reference file passes', () => {
  const { code } = run('valid')
  assert.equal(code, 0)
})

test('missing required frontmatter fields fail', () => {
  const { code, out } = run('missing-fields')
  assert.equal(code, 1)
  assert.match(out, /missing required frontmatter field/)
})

test('invisible Unicode causes failure', () => {
  const { code, out } = run('invisible-unicode')
  assert.equal(code, 1)
  assert.match(out, /invisible Unicode/)
})

test('fewer than 4 keywords causes failure', () => {
  const { code, out } = run('few-keywords')
  assert.equal(code, 1)
  assert.match(out, /at least 4 entries/)
})

test('version as string fails', () => {
  const { code, out } = run('version-as-string')
  assert.equal(code, 1)
  assert.match(out, /version must be a number/)
})

test('keywords as scalar (not array) fails', () => {
  const { code, out } = run('keywords-not-array')
  assert.equal(code, 1)
  assert.match(out, /keywords must be an array/)
})

test('malformed YAML frontmatter fails', () => {
  const { code, out } = run('malformed-yaml')
  assert.equal(code, 1)
  assert.match(out, /frontmatter parse error/)
})

test('empty references directory passes', () => {
  const { code } = run('empty-references')
  assert.equal(code, 0)
})

test('valid SKILL.md frontmatter passes', () => {
  const { code } = run('skills-valid')
  assert.equal(code, 0)
})

test('SKILL.md without frontmatter fails', () => {
  const { code, out } = run('skill-no-frontmatter')
  assert.equal(code, 1)
  assert.match(out, /must start with YAML frontmatter/)
})

test('SKILL.md frontmatter name not matching directory fails', () => {
  const { code, out } = run('skill-name-mismatch')
  assert.equal(code, 1)
  assert.match(out, /must match directory name 'bokforing'/)
})

test('SKILL.md without description fails', () => {
  const { code, out } = run('skill-missing-description')
  assert.equal(code, 1)
  assert.match(out, /missing required frontmatter field: description/)
})

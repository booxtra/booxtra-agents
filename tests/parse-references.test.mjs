import { test } from 'node:test'
import assert from 'node:assert/strict'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseReferences } from '../scripts/lib/parse-references.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REAL_REFS = join(__dirname, '../references')

test('parseReferences returns all 4 reference files', () => {
  const index = parseReferences(REAL_REFS)
  assert.equal(index.length, 4)
  const ids = index.map(e => e.id).sort()
  assert.deepEqual(ids, ['anlaggning-vs-forbrukning', 'eget-uttag', 'moms', 'representation'])
})

test('each entry has all required fields with correct types', () => {
  const index = parseReferences(REAL_REFS)
  for (const entry of index) {
    assert.ok(typeof entry.id === 'string' && entry.id.length > 0, `${entry.file}: id missing`)
    assert.ok(typeof entry.title === 'string' && entry.title.length > 0, `${entry.file}: title missing`)
    assert.ok(Array.isArray(entry.keywords) && entry.keywords.length >= 4, `${entry.file}: keywords missing or fewer than 4`)
    assert.ok(typeof entry.version === 'number', `${entry.file}: version not a number`)
    assert.ok(typeof entry.giltig_from === 'string', `${entry.file}: giltig_from not a string`)
    assert.ok(typeof entry.file === 'string' && entry.file.endsWith('.md'), `${entry.file}: file field wrong`)
  }
})

test('moms entry file field matches the actual filename', () => {
  const index = parseReferences(REAL_REFS)
  const moms = index.find(e => e.id === 'moms')
  assert.ok(moms, 'moms entry not found')
  assert.equal(moms.file, 'moms.md')
  assert.ok(moms.keywords.includes('vat'), 'moms keywords must include English synonym "vat"')
})

test('entries are sorted by filename', () => {
  const index = parseReferences(REAL_REFS)
  const files = index.map(e => e.file)
  assert.deepEqual(files, [...files].sort())
})

test('giltig_from is an ISO date string (YYYY-MM-DD), not a Date object', () => {
  const index = parseReferences(REAL_REFS)
  for (const entry of index) {
    assert.match(entry.giltig_from, /^\d{4}-\d{2}-\d{2}$/, `${entry.file}: giltig_from must be YYYY-MM-DD format`)
  }
})

import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join as joinPath } from 'node:path'

// --- Fixture-based unit tests ---

test('parseReferences throws on non-existent directory', () => {
  assert.throws(
    () => parseReferences('/tmp/does-not-exist-booxtra-test-xyz'),
    /references directory not found/
  )
})

test('parseReferences handles giltig_from as a quoted YAML string', () => {
  const dir = mkdtempSync(joinPath(tmpdir(), 'booxtra-test-'))
  try {
    writeFileSync(joinPath(dir, 'test.md'), [
      '---',
      'id: test',
      'title: Test',
      'keywords: [a, b, c, d]',
      'version: 1',
      'giltig_from: "2026-01-01"',
      '---',
      'Body.',
    ].join('\n'))
    const index = parseReferences(dir)
    assert.equal(index.length, 1)
    assert.equal(index[0].giltig_from, '2026-01-01')
  } finally {
    rmSync(dir, { recursive: true })
  }
})

test('parseReferences throws when giltig_from is missing', () => {
  const dir = mkdtempSync(joinPath(tmpdir(), 'booxtra-test-'))
  try {
    writeFileSync(joinPath(dir, 'bad.md'), [
      '---',
      'id: bad',
      'title: Bad',
      'keywords: [a, b, c, d]',
      'version: 1',
      '---',
      'Body.',
    ].join('\n'))
    assert.throws(
      () => parseReferences(dir),
      /giltig_from must be a YYYY-MM-DD date/
    )
  } finally {
    rmSync(dir, { recursive: true })
  }
})

test('parseReferences returns keywords as empty array when field is a scalar', () => {
  const dir = mkdtempSync(joinPath(tmpdir(), 'booxtra-test-'))
  try {
    writeFileSync(joinPath(dir, 'scalar.md'), [
      '---',
      'id: scalar',
      'title: Scalar keywords',
      'keywords: moms',
      'version: 1',
      'giltig_from: "2026-01-01"',
      '---',
      'Body.',
    ].join('\n'))
    const index = parseReferences(dir)
    assert.deepEqual(index[0].keywords, [])
  } finally {
    rmSync(dir, { recursive: true })
  }
})

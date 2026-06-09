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

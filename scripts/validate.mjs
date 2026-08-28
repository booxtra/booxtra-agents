#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'

const ROOT = process.env.BOOXTRA_ROOT
  ? resolve(process.env.BOOXTRA_ROOT)
  : resolve(fileURLToPath(new URL('..', import.meta.url)))

const REQUIRED_FIELDS = ['id', 'title', 'keywords', 'version', 'giltig_from']
const MIN_KEYWORDS = 4
const MAX_DESCRIPTION = 1024

// Matches non-printable control chars and invisible Unicode codepoints.
// Uses explicit Unicode escapes so editors cannot silently corrupt the regex
// by stripping or re-encoding invisible characters.
// Ranges covered:
//   \x00-\x08       C0 control chars (excluding tab \x09, LF \x0a)
//   \x0b-\x0c       vertical tab, form feed
//   \x0e-\x1f       remaining C0 control chars (excluding CR \x0d)
//   \x7f-\x9f       DEL + C1 control characters
//   \u200b-\u200f   ZWSP, ZWNJ, ZWJ, LRM, RLM
//   \u2028-\u202e   line/paragraph separators + bidi overrides
//   \u2060-\u206f   word joiner + invisible formatting characters
//   \ufeff          BOM / zero-width no-break space
const INVISIBLE_RE = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/

let errors = 0

function fail(file, msg) {
  console.error(`ERROR [${relative(ROOT, file)}]: ${msg}`)
  errors++
}

function walkMd(dir) {
  const results = []
  let entries
  try { entries = readdirSync(dir) } catch { return results }
  for (const entry of entries) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) results.push(...walkMd(full))
    else if (entry.endsWith('.md')) results.push(full)
  }
  return results
}

function checkInvisible(file, content) {
  content.split('\n').forEach((line, i) => {
    const m = line.match(INVISIBLE_RE)
    if (m) {
      const cp = `U+${m[0].codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`
      fail(file, `invisible Unicode ${cp} on line ${i + 1}`)
    }
  })
}

// 1. references/ -- frontmatter + invisible Unicode
for (const file of walkMd(join(ROOT, 'references'))) {
  const raw = readFileSync(file, 'utf8')
  checkInvisible(file, raw)

  let parsed
  try { parsed = matter(raw) } catch (e) {
    fail(file, `frontmatter parse error: ${e.message}`)
    continue
  }

  const d = parsed.data
  for (const field of REQUIRED_FIELDS) {
    if (d[field] == null || d[field] === '') fail(file, `missing required frontmatter field: ${field}`)
  }

  if (d.keywords !== undefined) {
    if (!Array.isArray(d.keywords)) {
      fail(file, 'keywords must be an array')
    } else if (d.keywords.length < MIN_KEYWORDS) {
      fail(file, `keywords must have at least ${MIN_KEYWORDS} entries (include Swedish + English synonyms); found ${d.keywords.length}`)
    }
  }

  if (d.version !== undefined && typeof d.version !== 'number') {
    fail(file, `version must be a number, got ${typeof d.version}`)
  }
}

// 2. skills/*/SKILL.md -- frontmatter required by Claude Desktop's plugin loader
let skillDirs = []
try {
  skillDirs = readdirSync(join(ROOT, 'skills')).filter((e) =>
    statSync(join(ROOT, 'skills', e)).isDirectory()
  )
} catch { /* no skills/ directory */ }

for (const skill of skillDirs) {
  const file = join(ROOT, 'skills', skill, 'SKILL.md')

  let raw
  try { raw = readFileSync(file, 'utf8') } catch {
    fail(file, `skills/${skill}/ has no SKILL.md`)
    continue
  }

  // Claude Desktop rejects the whole plugin if any SKILL.md lacks frontmatter.
  if (!raw.startsWith('---')) {
    fail(file, 'must start with YAML frontmatter (---)')
    continue
  }

  let parsed
  try { parsed = matter(raw) } catch (e) {
    fail(file, `frontmatter parse error: ${e.message}`)
    continue
  }

  const { name, description } = parsed.data
  if (!name) fail(file, 'missing required frontmatter field: name')
  else if (name !== skill) fail(file, `frontmatter name '${name}' must match directory name '${skill}'`)

  if (!description) fail(file, 'missing required frontmatter field: description')
  else if (description.length > MAX_DESCRIPTION) {
    fail(file, `description must be at most ${MAX_DESCRIPTION} characters; found ${description.length}`)
  }
}

// 3. base-prompt.md + skills/ -- invisible Unicode only
const unicodePaths = [
  join(ROOT, 'base-prompt.md'),
  ...walkMd(join(ROOT, 'skills')),
]

for (const file of unicodePaths) {
  try {
    checkInvisible(file, readFileSync(file, 'utf8'))
  } catch (e) {
    if (e.code !== 'ENOENT') fail(file, `could not read: ${e.message}`)
  }
}

if (errors > 0) {
  console.error(`\nValidation failed with ${errors} error(s).`)
  process.exit(1)
}
console.log('Validation passed.')

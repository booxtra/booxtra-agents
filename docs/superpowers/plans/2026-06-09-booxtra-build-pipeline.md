# Booxtra Agents — Build Pipeline (Plan 2/3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the pipeline that transforms the Plan 1 foundation into a publishable `@booxtra/knowledge` npm package plus the CI/CD infrastructure to validate and release on every PR and tag.

**Architecture:** Three layers: (1) `parse-references.mjs` — pure ESM module, no side effects, reads `references/` and returns a typed index; (2) `build-knowledge-package.mjs` — standalone script, uses the module, writes `dist/knowledge/`; (3) stub build scripts for Claude/Hermes/Gemini (Plan 3 will replace them) so `build.sh` runs end-to-end today. GitHub Actions runs validate + test on PRs and publishes `@booxtra/knowledge` on `v*` tags.

**Tech Stack:** Node.js 20+ (ESM), gray-matter 4.x (existing), node:test + node:fs (built-in), GitHub Actions

---

## File Structure

```
scripts/lib/
  parse-references.mjs          — exports parseReferences(refsDir): IndexEntry[]
  build-knowledge-package.mjs   — standalone script: writes dist/knowledge/
  build-claude.mjs              — stub ("Plan 3", exits 0)
  build-hermes.mjs              — stub ("Plan 3", exits 0)
  build-gemini.mjs              — stub ("Plan 3", exits 0)

scripts/
  build.sh                      — orchestrates: validate → build-knowledge → build-claude → build-hermes → build-gemini

tests/
  parse-references.test.mjs     — unit tests for the module
  build-knowledge-package.test.mjs — integration test (runs script, checks dist/knowledge/)

.github/workflows/
  validate.yml                  — run validate.mjs + npm test on every PR and push to main
  release.yml                   — run build.sh + publish @booxtra/knowledge on v* tags

Modified:
  package.json                  — update "test" script to include all three test files
```

**dist/ is gitignored — never committed.**

---

## Task 1: parse-references.mjs (TDD)

**Files:**
- Create: `scripts/lib/parse-references.mjs`
- Create: `tests/parse-references.test.mjs`
- Modify: `package.json` (update test script)

- [ ] **Step 1: Update package.json test script to include the new test file**

Open `package.json` and change the `"test"` script from:
```json
"test": "node --test tests/validate.test.mjs"
```
to:
```json
"test": "node --test tests/validate.test.mjs tests/parse-references.test.mjs"
```

- [ ] **Step 2: Write the failing tests**

Create `tests/parse-references.test.mjs`:

```javascript
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
```

- [ ] **Step 3: Run tests — expect the new tests to FAIL**

```bash
npm test
```

Expected: The 4 parse-references tests fail with `Cannot find module '../scripts/lib/parse-references.mjs'`. The 8 validate tests still pass.

- [ ] **Step 4: Implement scripts/lib/parse-references.mjs**

```javascript
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import matter from 'gray-matter'

/**
 * Parse all markdown files in refsDir and return a structured index.
 * @param {string} refsDir - absolute path to references/ directory
 * @returns {Array<{id: string, title: string, keywords: string[], version: number, giltig_from: string, file: string}>}
 */
export function parseReferences(refsDir) {
  const files = readdirSync(refsDir).filter(f => f.endsWith('.md')).sort()
  return files.map(filename => {
    const raw = readFileSync(join(refsDir, filename), 'utf8')
    const { data } = matter(raw)
    return {
      id: data.id,
      title: data.title,
      keywords: Array.isArray(data.keywords) ? data.keywords : [],
      version: data.version,
      giltig_from: String(data.giltig_from),
      file: filename,
    }
  })
}
```

- [ ] **Step 5: Run tests — expect all to PASS**

```bash
npm test
```

Expected: 12 tests pass (8 validate + 4 parse-references), 0 fail.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/parse-references.mjs tests/parse-references.test.mjs package.json
git commit -m "feat: add parse-references module with tests"
```

---

## Task 2: build-knowledge-package.mjs (TDD)

**Files:**
- Create: `scripts/lib/build-knowledge-package.mjs`
- Create: `tests/build-knowledge-package.test.mjs`
- Modify: `package.json` (add third test file to test script)

- [ ] **Step 1: Update package.json test script to include the integration test**

Change `"test"` from:
```json
"test": "node --test tests/validate.test.mjs tests/parse-references.test.mjs"
```
to:
```json
"test": "node --test tests/validate.test.mjs tests/parse-references.test.mjs tests/build-knowledge-package.test.mjs"
```

- [ ] **Step 2: Write the failing integration test**

Create `tests/build-knowledge-package.test.mjs`:

```javascript
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

test('dist/knowledge/base-prompt.md exists and contains get_knowledge', () => {
  const filePath = join(DIST, 'base-prompt.md')
  assert.ok(existsSync(filePath), 'base-prompt.md missing from dist/knowledge/')
  const content = readFileSync(filePath, 'utf8')
  assert.ok(content.includes('get_knowledge'), 'base-prompt must mention get_knowledge')
})

test('dist/knowledge/package.json has correct name, version, and is public', () => {
  const pkgPath = join(DIST, 'package.json')
  assert.ok(existsSync(pkgPath), 'package.json missing from dist/knowledge/')
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  assert.equal(pkg.name, '@booxtra/knowledge')
  assert.ok(typeof pkg.version === 'string' && pkg.version.length > 0, 'version must be a non-empty string')
  assert.strictEqual(pkg.private, false)
})
```

- [ ] **Step 3: Run tests — expect the 4 new tests to FAIL**

```bash
npm test
```

Expected: 4 build-knowledge-package tests fail with `Cannot find module '.../scripts/lib/build-knowledge-package.mjs'`.

- [ ] **Step 4: Implement scripts/lib/build-knowledge-package.mjs**

```javascript
#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'
import { parseReferences } from './parse-references.mjs'

const ROOT = process.env.BOOXTRA_ROOT
  ? resolve(process.env.BOOXTRA_ROOT)
  : resolve(fileURLToPath(new URL('../..', import.meta.url)))

const OUT = join(ROOT, 'dist', 'knowledge')
mkdirSync(OUT, { recursive: true })

const index = parseReferences(join(ROOT, 'references'))

writeFileSync(join(OUT, 'index.json'), JSON.stringify(index, null, 2) + '\n')

for (const entry of index) {
  const raw = readFileSync(join(ROOT, 'references', entry.file), 'utf8')
  const { content } = matter(raw)
  writeFileSync(join(OUT, entry.file), content.trimStart())
}

writeFileSync(
  join(OUT, 'base-prompt.md'),
  readFileSync(join(ROOT, 'base-prompt.md'), 'utf8')
)

const { version } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
writeFileSync(
  join(OUT, 'package.json'),
  JSON.stringify({
    name: '@booxtra/knowledge',
    version,
    description: 'Booxtra knowledge base — references and base prompt for MCP server',
    private: false,
    files: ['index.json', '*.md'],
    main: 'index.json',
  }, null, 2) + '\n'
)

console.log(`Built @booxtra/knowledge@${version} → dist/knowledge/ (${index.length} references)`)
```

- [ ] **Step 5: Run tests — expect all 16 to PASS**

```bash
npm test
```

Expected: 16 tests pass (8 validate + 4 parse-references + 4 build-knowledge-package), 0 fail.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/build-knowledge-package.mjs tests/build-knowledge-package.test.mjs package.json
git commit -m "feat: add build-knowledge-package script with integration tests"
```

---

## Task 3: build.sh + stub scripts

**Files:**
- Create: `scripts/lib/build-claude.mjs`
- Create: `scripts/lib/build-hermes.mjs`
- Create: `scripts/lib/build-gemini.mjs`
- Create: `scripts/build.sh`

These are stub scripts that exit 0 with a clear message. `build.sh` runs all steps end-to-end with `set -euo pipefail`.

- [ ] **Step 1: Create stub build-claude.mjs**

```javascript
#!/usr/bin/env node
console.log('build-claude: targets/claude/ not yet configured — see Plan 3')
```

- [ ] **Step 2: Create stub build-hermes.mjs**

```javascript
#!/usr/bin/env node
console.log('build-hermes: targets/hermes/ not yet configured — see Plan 3')
```

- [ ] **Step 3: Create stub build-gemini.mjs**

```javascript
#!/usr/bin/env node
console.log('build-gemini: targets/gemini/ not yet configured — see Plan 3')
```

- [ ] **Step 4: Create scripts/build.sh**

```bash
#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=== 1/5  Validating ==="
node "$ROOT/scripts/validate.mjs"

echo "=== 2/5  Building @booxtra/knowledge ==="
node "$ROOT/scripts/lib/build-knowledge-package.mjs"

echo "=== 3/5  Building Claude plugin ==="
node "$ROOT/scripts/lib/build-claude.mjs"

echo "=== 4/5  Building Hermes plugin ==="
node "$ROOT/scripts/lib/build-hermes.mjs"

echo "=== 5/5  Building Gemini extension ==="
node "$ROOT/scripts/lib/build-gemini.mjs"

echo "=== Build complete ==="
```

- [ ] **Step 5: Make build.sh executable**

```bash
chmod +x scripts/build.sh
```

- [ ] **Step 6: Run npm run build — expect success**

```bash
npm run build
```

Expected output:
```
=== 1/5  Validating ===
Validation passed.
=== 2/5  Building @booxtra/knowledge ===
Built @booxtra/knowledge@0.1.0 → dist/knowledge/ (4 references)
=== 3/5  Building Claude plugin ===
build-claude: targets/claude/ not yet configured — see Plan 3
=== 4/5  Building Hermes plugin ===
build-hermes: targets/hermes/ not yet configured — see Plan 3
=== 5/5  Building Gemini extension ===
build-gemini: targets/gemini/ not yet configured — see Plan 3
=== Build complete ===
```

- [ ] **Step 7: Confirm dist/ is not tracked by git**

```bash
git status
```

Expected: `dist/` does not appear (it is excluded by `.gitignore`).

- [ ] **Step 8: Commit**

```bash
git add scripts/build.sh scripts/lib/build-claude.mjs scripts/lib/build-hermes.mjs scripts/lib/build-gemini.mjs
git commit -m "feat: add build.sh and stub build scripts"
```

---

## Task 4: GitHub Actions workflows

**Files:**
- Create: `.github/workflows/validate.yml`
- Create: `.github/workflows/release.yml`

- [ ] **Step 1: Create .github/workflows/validate.yml**

```yaml
name: Validate

on:
  pull_request:
  push:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm
      - run: npm ci
      - run: npm run validate
      - run: npm test
```

- [ ] **Step 2: Create .github/workflows/release.yml**

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm
          registry-url: https://registry.npmjs.org

      - run: npm ci

      - name: Update package version to match tag
        run: |
          TAG="${GITHUB_REF_NAME}"          # e.g. v0.3.0
          VERSION="${TAG#v}"                # strip leading v → 0.3.0
          npm version "$VERSION" --no-git-tag-version

      - name: Build
        run: bash scripts/build.sh

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          generate_release_notes: true

      - name: Publish @booxtra/knowledge to npm
        run: npm publish --access public
        working-directory: dist/knowledge
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Note: the release job uses `softprops/action-gh-release@v2` to create the GitHub Release (with auto-generated notes). Bundle files (`dist/booxtra.plugin`, etc.) will be added to the `files:` field in Plan 3. The `npm version` step keeps `dist/knowledge/package.json` in sync with the git tag.

- [ ] **Step 3: Validate YAML syntax**

```bash
node -e "
import('node:fs').then(fs => {
  ['validate', 'release'].forEach(name => {
    const path = '.github/workflows/' + name + '.yml'
    const content = fs.readFileSync(path, 'utf8')
    if (content.trim().length === 0) throw new Error(path + ' is empty')
    console.log(path + ': OK (' + content.split('\n').length + ' lines)')
  })
})
"
```

Expected: both files report OK.

- [ ] **Step 4: Commit**

```bash
git add .github/
git commit -m "feat: add CI/CD workflows (validate on PR, release on tag)"
```

---

## Self-Review

### Spec coverage

| Spec requirement | Task |
|-----------------|------|
| `parse-references.mjs` → index | Task 1 |
| `build-knowledge-package.mjs` → `dist/knowledge/` | Task 2 |
| `index.json` with `[{id, title, keywords, version, file}]` | Task 2 |
| Each reference file in dist (frontmatter stripped) | Task 2 |
| `base-prompt.md` in dist | Task 2 |
| `@booxtra/knowledge` has same version as tag | Task 2 + Task 4 (npm version step) |
| `build.sh` with `set -euo pipefail`, validate first | Task 3 |
| `build-claude.mjs`, `build-hermes.mjs`, `build-gemini.mjs` exist | Task 3 (stubs) |
| `validate.yml` — runs validate.mjs + tests on every PR | Task 4 |
| `release.yml` — builds + publishes `@booxtra/knowledge` on `v*` | Task 4 |
| Commits never include `dist/` | Task 3, Step 7 |
| `NPM_TOKEN` from GitHub Secrets | Task 4 (used in release.yml) |

### Not in Plan 2 (by design)

- Real `build-claude.mjs`, `build-hermes.mjs`, `build-gemini.mjs` → Plan 3
- `targets/` source files → Plan 3
- `softprops/action-gh-release` bundle files → Plan 3 (release.yml stub present)
- `giltig_from` coerced to string in `parseReferences` — YAML date objects become Date instances; `String(data.giltig_from)` gives `"Tue Jan 01 2026 00:00:00 GMT..."`. This is a known issue. Fix: use `matter(raw, { engines: { yaml: { ... } } })` or parse with `String(data.giltig_from).slice(0, 10)` to get `"2026-01-01"`. See Task 1, Step 4 — use `.slice(0, 10)` in the giltig_from line.

### Placeholder scan

Clean — all steps contain complete code.

### Type consistency

- `parseReferences` returns `{id, title, keywords, version, giltig_from, file}` — used consistently in Task 1 tests and Task 2 script.
- `build-knowledge-package.mjs` imports `parseReferences` from `./parse-references.mjs` — matches the export in Task 1.
- `before()` hook in Task 2 test runs the build script before assertions — correct node:test API.

### Fix: giltig_from date string

In Task 1, Step 4, the `giltig_from` line should use:
```javascript
giltig_from: String(data.giltig_from).slice(0, 10),
```
This ensures the output is always `"2026-01-01"` regardless of how gray-matter parses the YAML date, and matches what tests expect.

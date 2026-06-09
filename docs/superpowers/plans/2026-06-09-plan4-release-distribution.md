# Plan 4: Release Distribution — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make built artifacts downloadable as GitHub Release assets by adding a zip step to the Claude build, implementing the Hermes bundle, and wiring `release.yml` to attach both files.

**Architecture:** Three independent build changes (Claude zip, Hermes tar.gz, release.yml) joined by a single `files:` directive in the GitHub Actions release step. TDD throughout — write the failing test before each implementation. No new npm dependencies; `zip` and `tar` are available in both the CI runner and macOS.

**Tech Stack:** Node.js ESM scripts (same pattern as existing builds), `gray-matter` (already installed), `zip` and `tar` CLI, `softprops/action-gh-release@v2` (already in workflow).

---

## File Map

| File | Action |
|------|--------|
| `scripts/lib/build-claude.mjs` | Add `execSync` import + zip step at end |
| `tests/build-claude.test.mjs` | Add 2 zip assertions |
| `targets/hermes/plugin.yaml` | Create |
| `targets/hermes/__init__.py` | Create |
| `targets/hermes/hooks.py` | Create |
| `targets/hermes/config.example.yaml` | Create |
| `scripts/lib/build-hermes.mjs` | Replace stub with full implementation |
| `tests/build-hermes.test.mjs` | Create |
| `package.json` | Add hermes test to `test` script |
| `.github/workflows/release.yml` | Add `files:` to release step |

---

## Task 1: Claude plugin zip

**Files:**
- Modify: `tests/build-claude.test.mjs`
- Modify: `scripts/lib/build-claude.mjs`

- [ ] **Step 1: Add zip assertions to existing test file**

Open `tests/build-claude.test.mjs`. Add these two tests at the end of the file (after the last existing `test(...)` block):

```js
test('dist/booxtra.plugin.zip is created', () => {
  const zipPath = join(ROOT, 'dist', 'booxtra.plugin.zip')
  assert.ok(existsSync(zipPath), 'booxtra.plugin.zip missing')
})

test('booxtra.plugin.zip contains key entry points', () => {
  const zipPath = join(ROOT, 'dist', 'booxtra.plugin.zip')
  const listing = execSync(`unzip -l "${zipPath}"`, { encoding: 'utf8' })
  assert.ok(listing.includes('.claude-plugin/plugin.json'), '.claude-plugin/plugin.json missing from zip')
  assert.ok(listing.includes('.mcp.json'), '.mcp.json missing from zip')
  assert.ok(listing.includes('skills/regler/SKILL.md'), 'skills/regler/SKILL.md missing from zip')
})
```

- [ ] **Step 2: Run the Claude build test to confirm it fails**

```bash
node --test tests/build-claude.test.mjs
```

Expected: the two new tests fail with `booxtra.plugin.zip missing`.

- [ ] **Step 3: Add zip step to `scripts/lib/build-claude.mjs`**

At the top of `build-claude.mjs`, add `execSync` to the existing `node:child_process` import. The file currently has no child_process import, so add a new line after the existing imports:

```js
import { execSync } from 'node:child_process'
```

Then add these lines at the very end of `build-claude.mjs`, after the existing `console.log(...)`:

```js
// Zip (contents flat — no wrapping directory)
const ZIP = join(ROOT, 'dist', 'booxtra.plugin.zip')
rmSync(ZIP, { force: true })
execSync(`cd "${OUT}" && zip -r "${ZIP}" .`, { stdio: 'inherit' })
console.log(`Zipped → dist/booxtra.plugin.zip`)
```

- [ ] **Step 4: Run the Claude build test to confirm it passes**

```bash
node --test tests/build-claude.test.mjs
```

Expected: all tests pass, including the two new ones.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/build-claude.mjs tests/build-claude.test.mjs
git commit -m "feat: add zip step to build-claude and assert in tests"
```

---

## Task 2: Create `targets/hermes/` source files

**Files:**
- Create: `targets/hermes/plugin.yaml`
- Create: `targets/hermes/__init__.py`
- Create: `targets/hermes/hooks.py`
- Create: `targets/hermes/config.example.yaml`

These are source templates — no automated tests needed here.

- [ ] **Step 1: Create `targets/hermes/plugin.yaml`**

```yaml
name: booxtra
version: "{{VERSION}}"
description: Booxtra — bokföringsassistent med MCP-verktyg för svenska SMF
```

- [ ] **Step 2: Create `targets/hermes/__init__.py`**

```python
import sys
import pathlib

PLUGIN_DIR = pathlib.Path(__file__).parent
sys.path.insert(0, str(PLUGIN_DIR))
from hooks import pre_llm_call as _pre_llm_call  # noqa: E402

SKILLS = ['routing', 'onboarding', 'bokforing', 'regler', 'rapporter', 'avslut-och-export']

def register(ctx):
    for skill in SKILLS:
        ctx.register_skill(skill, str(PLUGIN_DIR / 'skills' / skill / 'SKILL.md'))
    ctx.register_hook('pre_llm_call', _pre_llm_call)
```

- [ ] **Step 3: Create `targets/hermes/hooks.py`**

```python
import json
import pathlib

_REFS_DIR = pathlib.Path(__file__).parent / 'references'
with open(_REFS_DIR / 'index.json') as _f:
    _INDEX = json.load(_f)

def pre_llm_call(message='', **kwargs):
    text = (message or '').lower()
    for entry in _INDEX:
        if any(kw.lower() in text for kw in entry['keywords']):
            return {'context': (_REFS_DIR / entry['file']).read_text()}
    return {}
```

- [ ] **Step 4: Create `targets/hermes/config.example.yaml`**

```yaml
# Lägg till detta i din ~/.hermes/config.yaml för att ansluta Booxtra-servern
mcp_servers:
  booxtra:
    url: https://booxtra.app/mcp
```

- [ ] **Step 5: Commit**

```bash
git add targets/hermes/
git commit -m "feat: add targets/hermes source templates (plugin.yaml, __init__, hooks, config.example)"
```

---

## Task 3: Implement `build-hermes.mjs`

**Files:**
- Create: `tests/build-hermes.test.mjs`
- Modify: `scripts/lib/build-hermes.mjs`
- Modify: `package.json`

- [ ] **Step 1: Create `tests/build-hermes.test.mjs`**

```js
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

test('archive contains all 6 skills', () => {
  const listing = execSync(`tar -tzf "${TAR}"`, { encoding: 'utf8' })
  const SKILLS = ['routing', 'onboarding', 'bokforing', 'regler', 'rapporter', 'avslut-och-export']
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
```

- [ ] **Step 2: Run test to confirm it fails (stub produces nothing)**

```bash
node --test tests/build-hermes.test.mjs
```

Expected: fails with `booxtra-hermes.tar.gz missing`.

- [ ] **Step 3: Replace `scripts/lib/build-hermes.mjs` with full implementation**

Replace the entire file with:

```js
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
const SKILLS = ['routing', 'onboarding', 'bokforing', 'regler', 'rapporter', 'avslut-och-export']
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
```

- [ ] **Step 4: Run Hermes test to confirm it passes**

```bash
node --test tests/build-hermes.test.mjs
```

Expected: all 6 tests pass.

- [ ] **Step 5: Add Hermes test to the full test suite in `package.json`**

In `package.json`, find the `"test"` script and append `tests/build-hermes.test.mjs`:

Current value:
```
"test": "node --test tests/validate.test.mjs tests/parse-references.test.mjs tests/build-knowledge-package.test.mjs tests/build-claude.test.mjs tests/build-gemini.test.mjs"
```

New value:
```
"test": "node --test tests/validate.test.mjs tests/parse-references.test.mjs tests/build-knowledge-package.test.mjs tests/build-claude.test.mjs tests/build-gemini.test.mjs tests/build-hermes.test.mjs"
```

- [ ] **Step 6: Run the full test suite**

```bash
npm test
```

Expected: all tests pass across all test files.

- [ ] **Step 7: Commit**

```bash
git add scripts/lib/build-hermes.mjs tests/build-hermes.test.mjs package.json
git commit -m "feat: implement build-hermes with integration tests"
```

---

## Task 4: Wire release assets in `release.yml`

**Files:**
- Modify: `.github/workflows/release.yml`

- [ ] **Step 1: Update the Create GitHub Release step**

In `.github/workflows/release.yml`, find the `Create GitHub Release` step:

```yaml
      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          generate_release_notes: true
```

Replace with:

```yaml
      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          generate_release_notes: true
          files: |
            dist/booxtra.plugin.zip
            dist/booxtra-hermes.tar.gz
```

- [ ] **Step 2: Verify the YAML is valid**

```bash
cat .github/workflows/release.yml
```

Confirm indentation is consistent (2 spaces throughout) and `files:` is nested under `with:`.

- [ ] **Step 3: Run the full test suite one final time**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "feat: attach plugin zip and hermes tar.gz as GitHub Release assets"
```

---

## Verification

After all tasks are complete, do a full build and confirm the expected outputs exist:

```bash
bash scripts/build.sh
ls -lh dist/booxtra.plugin.zip dist/booxtra-hermes.tar.gz
```

Expected output (sizes will vary):
```
-rw-r--r--  booxtra.plugin.zip
-rw-r--r--  booxtra-hermes.tar.gz
```

To release: push a version tag. GitHub Actions will run the full build and attach both files to the release.

```bash
git tag v0.2.0
git push origin v0.2.0
```

The GitHub Release page will show `booxtra.plugin.zip` and `booxtra-hermes.tar.gz` as downloadable assets.

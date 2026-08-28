# Booxtra Agents — Target Bundles (Plan 3/3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three stub build scripts with real implementations that produce `dist/booxtra.plugin/` (Claude + OpenClaw) and `dist/gemini-extension/` (Gemini CLI), and add the static Goose recipe template.

**Architecture:** Two real build scripts follow the same pattern as `build-knowledge-package.mjs` — pure Node.js ESM, use `parseReferences`, write to `dist/`. Static source templates live in `targets/<host>/` and are never edited by the build. Hermes stays a stub (Python plugin API is specced separately). Integration tests follow the `before()`-hook pattern already established in Plan 2.

**Tech Stack:** Node.js 20+ ESM, gray-matter (existing), node:fs, node:test (built-in)

---

## File Structure

```
targets/
  claude/
    plugin.json           ← plugin manifest template (version injected at build time)
    mcp.json              ← MCP server URL config (static)
  gemini/
    gemini-extension.json ← extension manifest template (version injected at build time)
  goose/
    booxtra.recipe.yaml   ← Goose recipe (static, not generated — distributed as-is)

scripts/lib/
  build-claude.mjs        ← replaces stub: writes dist/booxtra.plugin/
  build-gemini.mjs        ← replaces stub: writes dist/gemini-extension/

tests/
  build-claude.test.mjs   ← 4 integration tests (before() runs build-claude.mjs)
  build-gemini.test.mjs   ← 3 integration tests (before() runs build-gemini.mjs)

Modified:
  package.json            ← add build-claude.test.mjs and build-gemini.test.mjs to test script
  README.md               ← mark Plan 3 ✅
```

**dist/ is gitignored — never committed.**

**build-hermes.mjs stays a stub** — the Hermes Python plugin API requires a separate spec.

---

## Task 1: Create targets/ source templates

**Files:**
- Create: `targets/claude/plugin.json`
- Create: `targets/claude/mcp.json`
- Create: `targets/gemini/gemini-extension.json`
- Create: `targets/goose/booxtra.recipe.yaml`

No tests for this task — these are static template files with no logic.

- [ ] **Step 1: Create targets/claude/plugin.json**

```json
{
  "name": "booxtra",
  "displayName": "Booxtra",
  "description": "Swedish accounting assistant — bokföring, moms, representation",
  "version": "0.0.0",
  "tags": ["accounting", "sweden", "bokföring", "moms"]
}
```

Note: `version` is a placeholder — `build-claude.mjs` replaces it with the tag version at build time.

- [ ] **Step 2: Create targets/claude/mcp.json**

```json
{
  "mcpServers": {
    "booxtra": {
      "url": "https://booxtra.ai/mcp"
    }
  }
}
```

- [ ] **Step 3: Create targets/gemini/gemini-extension.json**

```json
{
  "name": "booxtra",
  "displayName": "Booxtra",
  "description": "Swedish accounting assistant — bokföring, moms, representation",
  "version": "0.0.0",
  "mcpServers": {
    "booxtra": {
      "httpUrl": "https://booxtra.ai/mcp"
    }
  },
  "contextFileName": "GEMINI.md"
}
```

Note: `version` is a placeholder — `build-gemini.mjs` replaces it at build time.

- [ ] **Step 4: Create targets/goose/booxtra.recipe.yaml**

```yaml
version: "1.0.0"
title: Booxtra
description: Swedish accounting assistant — bokföring, moms, representation
prompt: |
  Du är Booxtra, en redovisningsassistent för svenska företag. Hjälp användaren
  med bokföring, moms, representation och andra redovisningsfrågor. Verifiera
  alltid satskänsliga belopp via get_knowledge innan du använder dem.
extensions:
  - type: mcp
    name: booxtra
    uri: https://booxtra.ai/mcp
    timeout: 30
    bundled: false
```

- [ ] **Step 5: Commit**

```bash
git add targets/
git commit -m "feat: add targets/ source templates (claude, gemini, goose)"
```

---

## Task 2: build-claude.mjs (TDD)

**Files:**
- Modify: `scripts/lib/build-claude.mjs` (replace stub)
- Create: `tests/build-claude.test.mjs`
- Modify: `package.json` (add test file to test script)

The Claude plugin bundle (`dist/booxtra.plugin/`) contains:
- `.claude-plugin/plugin.json` — manifest (version from package.json)
- `.mcp.json` — MCP server URL
- `skills/<skill>/SKILL.md` — all 6 skills (orchestration only)
- `skills/regler/references/*.md` — all reference files with frontmatter stripped

- [ ] **Step 1: Update package.json test script**

Change `"test"` from:
```json
"test": "node --test tests/validate.test.mjs tests/parse-references.test.mjs tests/build-knowledge-package.test.mjs"
```
to:
```json
"test": "node --test tests/validate.test.mjs tests/parse-references.test.mjs tests/build-knowledge-package.test.mjs tests/build-claude.test.mjs"
```

- [ ] **Step 2: Write the failing integration test**

Create `tests/build-claude.test.mjs`:

```javascript
import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SCRIPT = join(ROOT, 'scripts/lib/build-claude.mjs')
const DIST = join(ROOT, 'dist', 'booxtra.plugin')

before(() => {
  execSync(`node "${SCRIPT}"`, { cwd: ROOT, encoding: 'utf8' })
})

test('plugin.json has correct name and version', () => {
  const pluginPath = join(DIST, '.claude-plugin', 'plugin.json')
  assert.ok(existsSync(pluginPath), '.claude-plugin/plugin.json missing')
  const pkg = JSON.parse(readFileSync(pluginPath, 'utf8'))
  assert.equal(pkg.name, 'booxtra')
  assert.ok(typeof pkg.version === 'string' && pkg.version.length > 0, 'version must be set')
})

test('.mcp.json has booxtra MCP server pointing at booxtra.ai', () => {
  const mcpPath = join(DIST, '.mcp.json')
  assert.ok(existsSync(mcpPath), '.mcp.json missing')
  const mcp = JSON.parse(readFileSync(mcpPath, 'utf8'))
  assert.ok(mcp.mcpServers && mcp.mcpServers.booxtra, 'booxtra MCP server missing')
  assert.ok(String(mcp.mcpServers.booxtra.url).includes('booxtra.ai'), 'MCP URL must reference booxtra.ai')
})

test('all 6 skills are present in dist/booxtra.plugin/skills/', () => {
  const SKILLS = ['routing', 'onboarding', 'bokforing', 'regler', 'rapporter', 'avslut-och-export']
  for (const skill of SKILLS) {
    assert.ok(existsSync(join(DIST, 'skills', skill, 'SKILL.md')), `skills/${skill}/SKILL.md missing`)
  }
})

test('skills/regler/references/ has 4 reference files without frontmatter', () => {
  const refsDir = join(DIST, 'skills', 'regler', 'references')
  assert.ok(existsSync(refsDir), 'skills/regler/references/ missing')
  const files = readdirSync(refsDir).filter(f => f.endsWith('.md'))
  assert.equal(files.length, 4)
  for (const file of files) {
    const content = readFileSync(join(refsDir, file), 'utf8')
    assert.ok(!content.startsWith('---'), `${file} still has YAML frontmatter`)
    assert.ok(content.trim().length > 0, `${file} is empty`)
  }
})
```

- [ ] **Step 3: Run tests — expect 4 new tests to FAIL**

```bash
npm test
```

Expected: `build-claude` 4 tests fail (stub prints message, exits 0 but doesn't create dist). 21 existing tests still pass.

- [ ] **Step 4: Implement scripts/lib/build-claude.mjs**

Replace the entire file with:

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

const { version } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const refs = parseReferences(join(ROOT, 'references'))

const OUT = join(ROOT, 'dist', 'booxtra.plugin')

// Plugin manifest (with version injected)
mkdirSync(join(OUT, '.claude-plugin'), { recursive: true })
const pluginJson = JSON.parse(readFileSync(join(ROOT, 'targets/claude/plugin.json'), 'utf8'))
pluginJson.version = version
writeFileSync(join(OUT, '.claude-plugin', 'plugin.json'), JSON.stringify(pluginJson, null, 2) + '\n')

// MCP server config
writeFileSync(join(OUT, '.mcp.json'), readFileSync(join(ROOT, 'targets/claude/mcp.json'), 'utf8'))

// Skills
const SKILLS = ['routing', 'onboarding', 'bokforing', 'regler', 'rapporter', 'avslut-och-export']
for (const skill of SKILLS) {
  mkdirSync(join(OUT, 'skills', skill), { recursive: true })
  writeFileSync(
    join(OUT, 'skills', skill, 'SKILL.md'),
    readFileSync(join(ROOT, 'skills', skill, 'SKILL.md'), 'utf8')
  )
}

// Reference files under skills/regler/references/ (frontmatter stripped)
const refsOut = join(OUT, 'skills', 'regler', 'references')
mkdirSync(refsOut, { recursive: true })
for (const entry of refs) {
  const { content } = matter(readFileSync(join(ROOT, 'references', entry.file), 'utf8'))
  writeFileSync(join(refsOut, entry.file), content.trimStart())
}

console.log(`Built booxtra.plugin@${version} → dist/booxtra.plugin/ (${refs.length} references)`)
```

- [ ] **Step 5: Run tests — expect all 25 to PASS**

```bash
npm test
```

Expected: 25 tests pass (8 validate + 9 parse-references + 4 build-knowledge-package + 4 build-claude), 0 fail.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/build-claude.mjs tests/build-claude.test.mjs package.json
git commit -m "feat: implement build-claude with integration tests"
```

---

## Task 3: build-gemini.mjs (TDD)

**Files:**
- Modify: `scripts/lib/build-gemini.mjs` (replace stub)
- Create: `tests/build-gemini.test.mjs`
- Modify: `package.json` (add test file to test script)

The Gemini extension bundle (`dist/gemini-extension/`) contains:
- `gemini-extension.json` — manifest (version from package.json)
- `GEMINI.md` — routing skill content + all references (frontmatter stripped), concatenated with `---` separators

- [ ] **Step 1: Update package.json test script**

Change `"test"` from:
```json
"test": "node --test tests/validate.test.mjs tests/parse-references.test.mjs tests/build-knowledge-package.test.mjs tests/build-claude.test.mjs"
```
to:
```json
"test": "node --test tests/validate.test.mjs tests/parse-references.test.mjs tests/build-knowledge-package.test.mjs tests/build-claude.test.mjs tests/build-gemini.test.mjs"
```

- [ ] **Step 2: Write the failing integration test**

Create `tests/build-gemini.test.mjs`:

```javascript
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

before(() => {
  execSync(`node "${SCRIPT}"`, { cwd: ROOT, encoding: 'utf8' })
})

test('gemini-extension.json has correct name, version, and contextFileName', () => {
  const extPath = join(DIST, 'gemini-extension.json')
  assert.ok(existsSync(extPath), 'gemini-extension.json missing')
  const ext = JSON.parse(readFileSync(extPath, 'utf8'))
  assert.equal(ext.name, 'booxtra')
  assert.equal(ext.contextFileName, 'GEMINI.md')
  assert.ok(typeof ext.version === 'string' && ext.version.length > 0, 'version must be set')
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
```

- [ ] **Step 3: Run tests — expect 3 new tests to FAIL**

```bash
npm test
```

Expected: `build-gemini` 3 tests fail. 25 existing tests still pass.

- [ ] **Step 4: Implement scripts/lib/build-gemini.mjs**

Replace the entire file with:

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

const { version } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const refs = parseReferences(join(ROOT, 'references'))

const OUT = join(ROOT, 'dist', 'gemini-extension')
mkdirSync(OUT, { recursive: true })

// Extension manifest (with version injected)
const extJson = JSON.parse(readFileSync(join(ROOT, 'targets/gemini/gemini-extension.json'), 'utf8'))
extJson.version = version
writeFileSync(join(OUT, 'gemini-extension.json'), JSON.stringify(extJson, null, 2) + '\n')

// GEMINI.md: routing skill + all references (frontmatter stripped), separated by ---
const sections = []
sections.push(readFileSync(join(ROOT, 'skills/routing/SKILL.md'), 'utf8').trim())
sections.push('')

for (const entry of refs) {
  const { content } = matter(readFileSync(join(ROOT, 'references', entry.file), 'utf8'))
  sections.push('---')
  sections.push('')
  sections.push(content.trim())
  sections.push('')
}

writeFileSync(join(OUT, 'GEMINI.md'), sections.join('\n') + '\n')

console.log(`Built gemini-extension@${version} → dist/gemini-extension/ (${refs.length} references)`)
```

- [ ] **Step 5: Run tests — expect all 28 to PASS**

```bash
npm test
```

Expected: 28 tests pass (8 validate + 9 parse-references + 4 build-knowledge-package + 4 build-claude + 3 build-gemini), 0 fail.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/build-gemini.mjs tests/build-gemini.test.mjs package.json
git commit -m "feat: implement build-gemini with integration tests"
```

---

## Task 4: End-to-end build + README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Run npm run build end-to-end**

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
Built booxtra.plugin@0.1.0 → dist/booxtra.plugin/ (4 references)
=== 4/5  Building Hermes plugin ===
build-hermes: targets/hermes/ not yet configured — see docs/superpowers/plans/ (Plan 3)
=== 5/5  Building Gemini extension ===
Built gemini-extension@0.1.0 → dist/gemini-extension/ (4 references)
=== Build complete ===
```

- [ ] **Step 2: Confirm dist/ structure**

```bash
find dist -not -path '*/node_modules/*' | sort
```

Expected:
```
dist
dist/booxtra.plugin
dist/booxtra.plugin/.claude-plugin
dist/booxtra.plugin/.claude-plugin/plugin.json
dist/booxtra.plugin/.mcp.json
dist/booxtra.plugin/skills
dist/booxtra.plugin/skills/avslut-och-export
dist/booxtra.plugin/skills/avslut-och-export/SKILL.md
dist/booxtra.plugin/skills/bokforing
dist/booxtra.plugin/skills/bokforing/SKILL.md
dist/booxtra.plugin/skills/onboarding
dist/booxtra.plugin/skills/onboarding/SKILL.md
dist/booxtra.plugin/skills/rapporter
dist/booxtra.plugin/skills/rapporter/SKILL.md
dist/booxtra.plugin/skills/regler
dist/booxtra.plugin/skills/regler/SKILL.md
dist/booxtra.plugin/skills/regler/references
dist/booxtra.plugin/skills/regler/references/anlaggning-vs-forbrukning.md
dist/booxtra.plugin/skills/regler/references/eget-uttag.md
dist/booxtra.plugin/skills/regler/references/moms.md
dist/booxtra.plugin/skills/regler/references/representation.md
dist/booxtra.plugin/skills/routing
dist/booxtra.plugin/skills/routing/SKILL.md
dist/gemini-extension
dist/gemini-extension/GEMINI.md
dist/gemini-extension/gemini-extension.json
dist/knowledge
dist/knowledge/anlaggning-vs-forbrukning.md
dist/knowledge/base-prompt.md
dist/knowledge/eget-uttag.md
dist/knowledge/index.json
dist/knowledge/moms.md
dist/knowledge/package.json
dist/knowledge/representation.md
```

- [ ] **Step 3: Confirm dist/ is not tracked by git**

```bash
git status
```

Expected: `dist/` does not appear (excluded by `.gitignore`).

- [ ] **Step 4: Update README.md**

Change the Plans section from:
```markdown
- Plan 3: Target bundles — Claude plugin, Hermes, Gemini, Goose
```
to:
```markdown
- Plan 3: Target bundles — Claude plugin, Hermes (stub), Gemini, Goose recipe ✅
```

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: update README to mark Plan 3 complete"
```

---

## Self-Review

### Spec coverage

| Spec requirement | Task |
|-----------------|------|
| `dist/booxtra.plugin/` — skills + references | Task 2 |
| `.claude-plugin/plugin.json` with name + version | Task 2 |
| `.mcp.json` pointing at `https://booxtra.ai/mcp` | Task 2 |
| References in `skills/regler/references/` (frontmatter stripped) | Task 2 |
| `dist/gemini-extension/gemini-extension.json` with `contextFileName: GEMINI.md` | Task 3 |
| `GEMINI.md` = routing skill + all references concatenated | Task 3 |
| `targets/goose/booxtra.recipe.yaml` static template | Task 1 |
| `build-hermes.mjs` stays a stub | — (unchanged) |
| `dist/` never committed | All tasks (gitignored) |

### Not in Plan 3 (by design)

- Real `build-hermes.mjs` — Python plugin API (`__init__.py`, `hooks.py`) requires separate spec
- ChatGPT connector — server-side OAuth work, not in this repo
- Goose build step — recipe is static, no build needed
- Release.yml bundle attachments — stubs for `softprops/action-gh-release` `files:` field (add in a future patch once all targets are real)

### Placeholder scan

Clean — all code blocks are complete.

### Type consistency

- `parseReferences` returns `{id, title, keywords, version, giltig_from, file}` — only `entry.file` is used in Tasks 2 and 3 (consistent with Plan 2 usage).
- `before()` hook pattern identical to `build-knowledge-package.test.mjs` — consistent.
- `DIST` constant in both test files points to the output directory (not the script) — consistent with existing test.

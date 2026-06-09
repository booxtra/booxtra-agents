# Plan 4: Release Distribution

**Datum:** 2026-06-09
**Repo:** `booxtra-agents`
**Förutsätter:** Plan 1–3 klara (references, build pipeline, target bundles)
**Syfte:** Gör byggda artefakter nedladdningsbara som GitHub Release assets. Implementerar Hermes-bundeln som saknades i Plan 3.

---

## Bakgrund

Plan 1–3 byggde upp valideringsinfrastruktur, build-pipeline och target-bundles. `release.yml` skapar redan GitHub Releases och publicerar `@booxtra/knowledge` till npm vid `v*`-tagg — men bifogar inga nedladdningsbara filer. `build-hermes.mjs` är en stub.

Plan 4 slutför distributions-loopen: användare ska kunna ladda ner `booxtra.plugin.zip` och `booxtra-hermes.tar.gz` direkt från GitHub Release-sidan.

---

## Arkitektur

Fyra förändringar, ingen ny infrastruktur:

```
build.sh
  ├── build-claude.mjs   → dist/booxtra.plugin/        (befintlig)
  │                         dist/booxtra.plugin.zip     ← ny
  ├── build-hermes.mjs   → dist/booxtra-hermes.tar.gz  ← implementeras
  └── build-gemini.mjs   → dist/gemini-extension/       (befintlig)

release.yml
  └── softprops/action-gh-release
        files: booxtra.plugin.zip, booxtra-hermes.tar.gz  ← ny
```

Gemini installeras via `gemini extensions install https://github.com/...` direkt från git-repot — inget release asset behövs.

---

## Komponenter

### 1. Claude plugin-zip (`build-claude.mjs`)

Lägg till i slutet av det befintliga scriptet: zippa innehållet i `dist/booxtra.plugin/` till `dist/booxtra.plugin.zip` via `zip` CLI (`child_process.execSync`).

Zip-struktur (innehåll direkt, ej kapslat under katalognamnet):
```
.claude-plugin/plugin.json
.mcp.json
skills/routing/SKILL.md
skills/onboarding/SKILL.md
skills/bokforing/SKILL.md
skills/regler/SKILL.md
skills/regler/references/moms.md
skills/regler/references/representation.md
skills/regler/references/eget-uttag.md
skills/regler/references/anlaggning-vs-forbrukning.md
skills/rapporter/SKILL.md
skills/avslut-och-export/SKILL.md
```

### 2. `targets/hermes/` — källfiler (nya)

**`plugin.yaml`**
```yaml
name: booxtra
version: "{{VERSION}}"
description: Booxtra — bokföringsassistent med MCP-verktyg för svenska SMF
```
`{{VERSION}}` ersätts av `build-hermes.mjs` med version från `package.json`.

**`__init__.py`**
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

**`hooks.py`**
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

**`config.example.yaml`**
```yaml
# Lägg till detta i din ~/.hermes/config.yaml för att ansluta Booxtra-servern
mcp_servers:
  booxtra:
    url: https://booxtra.app/mcp
```

### 3. `build-hermes.mjs` — implementeras (ersätter stub)

Steg:
1. Läs version från `package.json`
2. Rensa `dist/booxtra-hermes/`
3. Kopiera `targets/hermes/` med `{{VERSION}}` ersatt i `plugin.yaml`
4. Kopiera skills (samma lista som build-claude: routing, onboarding, bokforing, regler, rapporter, avslut-och-export)
5. Kopiera `references/` med frontmatter strippad (samma logik som build-claude via `parse-references.mjs` + `gray-matter`)
6. Kopiera `index.json` (genererat av `parse-references`)
7. Paketera: `tar -czf dist/booxtra-hermes.tar.gz -C dist booxtra-hermes`
8. Logga: `Built booxtra-hermes@{version} → dist/booxtra-hermes.tar.gz ({n} references)`

### 4. `release.yml` — bifoga filer

```yaml
- name: Create GitHub Release
  uses: softprops/action-gh-release@v2
  with:
    generate_release_notes: true
    files: |
      dist/booxtra.plugin.zip
      dist/booxtra-hermes.tar.gz
```

### 5. Tester

**`tests/build-hermes.test.mjs`** (ny) — verifierar:
- `dist/booxtra-hermes.tar.gz` skapas
- Arkivet innehåller `plugin.yaml`, `__init__.py`, `hooks.py`, `config.example.yaml`
- Arkivet innehåller `references/index.json` och alla referensfiler
- Arkivet innehåller alla six skills under `skills/`
- `plugin.yaml` innehåller rätt version (inte `{{VERSION}}`)
- Referensfiler saknar frontmatter-block

**`tests/build-claude.test.mjs`** (utökas) — lägg till:
- `dist/booxtra.plugin.zip` existerar
- Zip innehåller `.claude-plugin/plugin.json` och `.mcp.json`

---

## Dataflöde vid release

```
git push --tags v0.2.0
  → GitHub Actions: release.yml
    → npm ci
    → npm version 0.2.0 --no-git-tag-version
    → bash scripts/build.sh
        → validate.mjs
        → build-knowledge-package.mjs  → dist/knowledge/
        → build-claude.mjs             → dist/booxtra.plugin/ + dist/booxtra.plugin.zip
        → build-hermes.mjs             → dist/booxtra-hermes.tar.gz
        → build-gemini.mjs             → dist/gemini-extension/
    → softprops/action-gh-release
        → GitHub Release med booxtra.plugin.zip + booxtra-hermes.tar.gz bifogade
    → npm publish dist/knowledge/
```

---

## Distribution per kanal

| Kanal | Mekanism |
|-------|----------|
| Claude Desktop / Cowork | `booxtra.plugin.zip` från GitHub Release |
| OpenClaw | Samma zip via `openclaw plugins install` |
| Hermes | `booxtra-hermes.tar.gz` från GitHub Release → packa upp i `~/.hermes/plugins/booxtra/` |
| Gemini CLI | `gemini extensions install https://github.com/tullanders/booxtra-agents` |
| ChatGPT | Connector mot `https://booxtra.app/mcp` (separat) |
| Goose | Befintlig `booxtra.recipe.yaml` (separat) |

---

## Filer som ändras/skapas

| Fil | Åtgärd |
|-----|--------|
| `targets/hermes/plugin.yaml` | Skapas |
| `targets/hermes/__init__.py` | Skapas |
| `targets/hermes/hooks.py` | Skapas |
| `targets/hermes/config.example.yaml` | Skapas |
| `scripts/lib/build-hermes.mjs` | Implementeras (ersätter stub) |
| `scripts/lib/build-claude.mjs` | Utökas med zip-steg |
| `.github/workflows/release.yml` | Utökas med `files:` |
| `tests/build-hermes.test.mjs` | Skapas |
| `tests/build-claude.test.mjs` | Utökas |

Inget nytt beroende behövs — `zip` och `tar` finns i standardmiljön.

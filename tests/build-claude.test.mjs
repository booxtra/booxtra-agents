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

test('.mcp.json has booxtra MCP server pointing at booxtra.app', () => {
  const mcpPath = join(DIST, '.mcp.json')
  assert.ok(existsSync(mcpPath), '.mcp.json missing')
  const mcp = JSON.parse(readFileSync(mcpPath, 'utf8'))
  assert.ok(mcp.mcpServers && mcp.mcpServers.booxtra, 'booxtra MCP server missing')
  assert.ok(String(mcp.mcpServers.booxtra.url).includes('booxtra.app'), 'MCP URL must reference booxtra.app')
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

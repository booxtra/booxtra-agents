import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import matter from 'gray-matter'

function toDateString(value, filename) {
  // gray-matter parses unquoted YAML dates (e.g. 2026-01-01) as JS Date objects (UTC midnight)
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  throw new Error(`${filename}: giltig_from must be a YYYY-MM-DD date, got ${JSON.stringify(value)}`)
}

/**
 * Parse all markdown files in refsDir and return a structured index.
 * @param {string} refsDir - absolute path to references/ directory
 * @returns {Array<{id: string, title: string, keywords: string[], version: number, giltig_from: string, file: string}>}
 */
export function parseReferences(refsDir) {
  if (!existsSync(refsDir)) throw new Error(`references directory not found: ${refsDir}`)
  const files = readdirSync(refsDir).filter(f => f.endsWith('.md')).sort()
  return files.map(filename => {
    let data
    try {
      data = matter(readFileSync(join(refsDir, filename), 'utf8')).data
    } catch (e) {
      throw new Error(`${filename}: frontmatter parse error — ${e.message}`)
    }
    return {
      id: data.id,
      title: data.title,
      keywords: Array.isArray(data.keywords) ? data.keywords : [],
      version: data.version,
      giltig_from: toDateString(data.giltig_from, filename),
      file: filename,
    }
  })
}

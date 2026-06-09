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
      giltig_from: data.giltig_from instanceof Date
        ? data.giltig_from.toISOString().slice(0, 10)
        : String(data.giltig_from).slice(0, 10),
      file: filename,
    }
  })
}

import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const styles = join(root, 'packages/components/src/styles')
const source = join(root, 'packages/components/src')

/** Style sheets that may name a preset. Everything else reads tokens only. */
export const presetSheets = ['tokens.css']

/** Every `var(--token, literal)` fallback, keyed by token, then by fallback text. */
export function collectFallbacks(files) {
  const tokens = new Map()
  for (const [file, text] of files) {
    for (const match of text.matchAll(/var\(\s*(--[\w-]+)\s*,/g)) {
      let index = match.index + match[0].length
      let depth = 1
      const start = index
      while (index < text.length && depth > 0) {
        if (text[index] === '(') depth++
        else if (text[index] === ')') depth--
        index++
      }
      const fallback = text
        .slice(start, index - 1)
        .replace(/\s+/g, ' ')
        .trim()
      if (fallback.includes('var(')) continue
      const line = text.slice(0, match.index).split('\n').length
      if (!tokens.has(match[1])) tokens.set(match[1], new Map())
      const values = tokens.get(match[1])
      if (!values.has(fallback)) values.set(fallback, [])
      values.get(fallback).push(`${file}:${line}`)
    }
  }
  return tokens
}

export function inspectTheme(files, scripts = []) {
  const problems = []
  for (const [token, values] of collectFallbacks(files)) {
    if (values.size > 1)
      problems.push({
        kind: 'fallback',
        message: `${token} has ${values.size} literal fallbacks: ${[...values.keys()].join(' | ')}`,
        at: [...values.values()].map((locations) => locations[0]),
      })
  }
  for (const [file, text] of files) {
    text.split('\n').forEach((line, index) => {
      if (/!important/.test(line))
        problems.push({
          kind: 'important',
          message: '!important declaration',
          at: [`${file}:${index + 1}`],
        })
      if (
        /data-ui-preset/.test(line) &&
        !presetSheets.includes(file.split('/').pop())
      )
        problems.push({
          kind: 'preset-selector',
          message: 'preset selector outside the token sheet',
          at: [`${file}:${index + 1}`],
        })
    })
  }
  for (const [file, text] of scripts) {
    text.split('\n').forEach((line, index) => {
      if (/useThemePreset\(/.test(line))
        problems.push({
          kind: 'preset-test',
          message: 'component reads the preset',
          at: [`${file}:${index + 1}`],
        })
    })
  }
  return problems
}

function read(directory, pattern) {
  const entries = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      if (['vendor', 'theme'].includes(entry.name)) continue
      entries.push(...read(path, pattern))
    } else if (pattern.test(entry.name))
      entries.push([relative(root, path), readFileSync(path, 'utf8')])
  }
  return entries
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const strict = process.argv.includes('--strict')
  const problems = inspectTheme(read(styles, /\.css$/), read(source, /\.tsx?$/))
  const counts = Object.groupBy(problems, ({ kind }) => kind)
  console.log(
    `Theme check: ${problems.length} findings (${
      Object.entries(counts)
        .map(([kind, list]) => `${kind} ${list.length}`)
        .join(', ') || 'none'
    })`,
  )
  for (const problem of problems)
    console.log(
      `  ${problem.kind}: ${problem.message} at ${problem.at.join(', ')}`,
    )
  if (strict && problems.length) process.exit(1)
}

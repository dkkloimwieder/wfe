import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'

const require = createRequire(import.meta.url)
const manifest = require.resolve('typescript/package.json')
const { bin } = JSON.parse(readFileSync(manifest, 'utf8'))
const executable = resolve(dirname(manifest), bin.tsc)

export function runTsc(args, options) {
  const result = spawnSync(process.execPath, [executable, ...args], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    ...options,
  })
  if (result.error) throw result.error
  return result
}

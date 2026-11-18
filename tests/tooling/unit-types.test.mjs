import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { resolve } from 'node:path'
import { runTsc } from '../../scripts/lib/tsc.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const directory = `${root}tests/unit/`

function effectiveConfig(directory) {
  const result = runTsc(['--showConfig', '--project', 'tsconfig.json'], {
    cwd: directory,
  })
  assert.equal(result.status, 0, result.stderr || result.stdout)
  return JSON.parse(result.stdout)
}

test('the unit type project covers every test and retains the package compiler rules', async () => {
  const project = effectiveConfig(directory)
  const packages = effectiveConfig(root)
  for (const [key, value] of Object.entries(packages.compilerOptions))
    assert.deepEqual(project.compilerOptions[key], value, key)
  const files = (await readdir(directory, { recursive: true }))
    .filter((path) => /\.tsx?$/.test(path))
    .map((path) => `${directory}${path}`)
  assert.ok(files.length > 0)
  assert.deepEqual(
    project.files.map((path) => resolve(directory, path)).sort(),
    files.sort(),
  )
  const { scripts } = JSON.parse(await readFile(`${root}package.json`, 'utf8'))
  assert.equal(scripts['types:unit'], 'tsc --project tests/unit/tsconfig.json')
})

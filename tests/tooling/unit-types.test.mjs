import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import ts from 'typescript'

const root = fileURLToPath(new URL('../../', import.meta.url))
const directory = `${root}tests/unit/`

test('the unit type project covers every test and retains the package compiler rules', async () => {
  const config = ts.readConfigFile(`${directory}tsconfig.json`, ts.sys.readFile)
  assert.equal(config.error, undefined)
  const project = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    directory,
  )
  assert.deepEqual(project.errors, [])
  const rootConfig = ts.readConfigFile(`${root}tsconfig.json`, ts.sys.readFile)
  const packages = ts.parseJsonConfigFileContent(
    rootConfig.config,
    ts.sys,
    root,
  )
  for (const [key, value] of Object.entries(packages.options))
    assert.deepEqual(project.options[key], value, key)
  const files = (await readdir(directory, { recursive: true }))
    .filter((path) => /\.tsx?$/.test(path))
    .map((path) => `${directory}${path}`)
  assert.ok(files.length > 0)
  assert.deepEqual([...project.fileNames].sort(), files.sort())
  const { scripts } = JSON.parse(await readFile(`${root}package.json`, 'utf8'))
  assert.equal(scripts['types:unit'], 'tsc --project tests/unit/tsconfig.json')
})

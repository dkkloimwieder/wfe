import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  assertCoverageInventory,
  documents,
  examples,
  runners,
  contracts,
  typeScriptFences,
} from '../../scripts/coverage-inventory.mjs'
import { qualificationStages } from '../../scripts/qualify.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const stages = qualificationStages('/tmp/coverage-plan')
const optional = qualificationStages('/tmp/coverage-plan', { wamn: true })

test('every example entry point, type project, and documentation fence has a gate disposition', () => {
  assertCoverageInventory(root, stages, optional)
})

test('required runner and build omissions fail inventory validation', () => {
  assert.throws(
    () =>
      assertCoverageInventory(
        root,
        stages.filter(({ name }) => name !== 'theme-browser'),
        optional,
      ),
    /Missing runner stage: examples\/theme\/run.mjs/,
  )
  assert.throws(
    () =>
      assertCoverageInventory(
        root,
        stages.filter(({ name }) => name !== 'components-source-build'),
        optional,
      ),
    /Missing example stage: components-source-build/,
  )
})

test('new documentation, fences, runners, and type projects require an explicit disposition', () => {
  const scratch = mkdtempSync(resolve(tmpdir(), 'wfe-coverage-'))
  const write = (path, content = '') => {
    mkdirSync(resolve(scratch, path, '..'), { recursive: true })
    writeFileSync(resolve(scratch, path), content)
  }
  try {
    for (const entry of documents)
      write(
        entry.path,
        '```ts\nexport const value = 1\n```\n'.repeat(entry.fences),
      )
    for (const entry of runners) write(entry.path)
    for (const entry of examples)
      write(
        entry.types,
        JSON.stringify({
          include: contracts
            .filter(({ gate }) => gate === entry.types)
            .map(({ path }) => `../../${path}`),
        }),
      )
    for (const entry of contracts) write(entry.path)
    assertCoverageInventory(scratch, stages, optional)
    for (const [path, content, message] of [
      [
        'docs/new.md',
        '```typescript\nexport const added = true\n```\n',
        /Unclassified documentation/,
      ],
      ['examples/new/run.mjs', '', /Unclassified runner/],
      ['examples/new/tsconfig.json', '{}', /Unclassified example types/],
    ]) {
      write(path, content)
      assert.throws(
        () => assertCoverageInventory(scratch, stages, optional),
        message,
      )
      rmSync(resolve(scratch, path))
    }
    const excluded = documents.find(({ status }) => status === 'excluded')
    write(
      excluded.path,
      '```ts\nexport const value = 1\n```\n'.repeat(excluded.fences + 1),
    )
    assert.throws(
      () => assertCoverageInventory(scratch, stages, optional),
      /Changed documentation fence count/,
    )
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
})

test('documentation extraction accepts TypeScript aliases and CRLF fences', () => {
  assert.deepEqual(
    typeScriptFences('```typescript\r\nexport const n = 1\r\n```\r\n'),
    [{ language: 'ts', code: 'export const n = 1\r\n' }],
  )
})

test('hydration coverage requires every declared mode and optional stage', () => {
  assert.throws(
    () =>
      assertCoverageInventory(
        root,
        stages.filter(({ name }) => name !== 'charts-hydration-development'),
        optional,
      ),
    /Missing hydration stage: charts-hydration-development/,
  )
  assert.throws(
    () =>
      assertCoverageInventory(
        root,
        stages,
        optional.filter(
          ({ name }) => name !== 'wamn-generator-development-hydration',
        ),
      ),
    /Missing hydration stage: wamn-generator-development-hydration/,
  )
})

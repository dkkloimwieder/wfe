import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const check = fileURLToPath(new URL('../../scripts/check.mjs', import.meta.url))

async function withFakePnpm(failStage, work) {
  const directory = await mkdtemp(join(tmpdir(), 'wfe-check-test-'))
  const log = join(directory, 'calls.jsonl')
  try {
    await writeFile(
      join(directory, 'pnpm'),
      `#!${process.execPath}
const { appendFileSync } = require('node:fs')
const args = process.argv.slice(2)
appendFileSync(process.env.WFE_CHECK_LOG, JSON.stringify({ args, nodeEnv: process.env.NODE_ENV }) + '\\n')
if (process.env.WFE_CHECK_FAIL_STAGE && args.includes(process.env.WFE_CHECK_FAIL_STAGE)) process.exitCode = 7
`,
      { mode: 0o755 },
    )
    const result = spawnSync(process.execPath, [check], {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${directory}:${process.env.PATH}`,
        NODE_ENV: 'production',
        WFE_CHECK_LOG: log,
        WFE_CHECK_FAIL_STAGE: failStage ?? '',
      },
    })
    assert.ifError(result.error)
    const calls = (await readFile(log, 'utf8'))
      .trim()
      .split('\n')
      .map(JSON.parse)
    await work(result, calls)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

test('the required gate runs unit tests in test mode before the serial Node suite', () =>
  withFakePnpm(undefined, async (result, calls) => {
    assert.equal(result.status, 0, result.stderr)
    const units = calls.filter(({ args }) => args.includes('test:unit'))
    assert.equal(units.length, 1)
    assert.equal(units[0].nodeEnv, 'test')
    for (const call of calls.filter((entry) => entry !== units[0]))
      assert.equal(call.nodeEnv, 'production')
    const nodeTests = calls.find(({ args }) => args.includes('test'))
    assert.ok(
      nodeTests,
      'The gate must reach the Node suite after unit tests pass',
    )
    assert.ok(calls.indexOf(units[0]) < calls.indexOf(nodeTests))
    const { scripts } = JSON.parse(
      await readFile(join(root, 'package.json'), 'utf8'),
    )
    assert.match(scripts.test, /(?:^|\s)--test(?:\s|$)/)
    assert.match(scripts.test, /(?:^|\s)--test-concurrency(?:=|\s+)1(?:\s|$)/)
  }))

test('a failed unit suite fails the required gate and prevents later stages', () =>
  withFakePnpm('test:unit', async (result, calls) => {
    assert.equal(result.status, 7, result.stderr)
    const units = calls.filter(({ args }) => args.includes('test:unit'))
    assert.equal(units.length, 1)
    assert.equal(units[0].nodeEnv, 'test')
    assert.equal(calls.at(-1), units[0])
    assert.equal(
      calls.some(({ args }) => args.includes('test')),
      false,
    )
  }))

test('an earlier required failure prevents unit and Node suites from starting', () =>
  withFakePnpm('lint', async (result, calls) => {
    assert.equal(result.status, 7, result.stderr)
    assert.ok(calls.at(-1).args.includes('lint'))
    assert.equal(
      calls.some(({ args }) => args.includes('test:unit')),
      false,
    )
    assert.equal(
      calls.some(({ args }) => args.includes('test')),
      false,
    )
  }))

test('unit test types are required before runtime tests and stop the gate on failure', () =>
  withFakePnpm('types:unit', async (result, calls) => {
    assert.equal(result.status, 7, result.stderr)
    assert.deepEqual(calls.at(-1).args, ['types:unit'])
    assert.equal(
      calls.some(({ args }) => args.includes('test:unit')),
      false,
    )
  }))

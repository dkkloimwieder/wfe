import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, delimiter } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execute = promisify(execFile)
const helper = new URL(
  '../../examples/shared/browser/hydration-build.mjs',
  import.meta.url,
).href
for (const fails of [false, true]) {
  test(`hydration build preserves ordered modes and ${fails ? 'stops after server failure' : 'inherited environment'}`, async () => {
    const directory = await mkdtemp(join(tmpdir(), 'wfe-hydration-build-'))
    try {
      const log = join(directory, 'calls.jsonl')
      await writeFile(
        join(directory, 'pnpm'),
        `#!/usr/bin/env node
const fs = require('node:fs')
fs.appendFileSync(process.env.WFE_BUILD_LOG, JSON.stringify({ args: process.argv.slice(2), server: process.env.HYDRATION_SERVER, distribution: process.env.BENCH_DISTRIBUTION, development: process.env.BENCH_DEVELOPMENT, marker: process.env.WFE_BUILD_MARKER }) + '\\n')
if (process.env.WFE_BUILD_FAIL === '1') process.exit(7)
`,
        { mode: 0o755 },
      )
      const task = execute(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          `import {buildHydrationPair} from ${JSON.stringify(helper)}; buildHydrationPair('examples/grid/vite.hydration.config.ts')`,
        ],
        {
          env: {
            ...process.env,
            PATH: directory + delimiter + process.env.PATH,
            HYDRATION_SERVER: 'stale',
            BENCH_DISTRIBUTION: '1',
            BENCH_DEVELOPMENT: '1',
            WFE_BUILD_MARKER: 'inherited',
            WFE_BUILD_LOG: log,
            WFE_BUILD_FAIL: fails ? '1' : '',
          },
        },
      )
      if (fails) await assert.rejects(task)
      else await task
      const calls = (await readFile(log, 'utf8'))
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line))
      assert.deepEqual(
        calls.map((call) => call.server),
        fails ? ['1'] : ['1', ''],
      )
      for (const call of calls) {
        assert.deepEqual(call.args, [
          'exec',
          'vite',
          'build',
          '--config',
          'examples/grid/vite.hydration.config.ts',
        ])
        assert.equal(call.distribution, '1')
        assert.equal(call.development, '1')
        assert.equal(call.marker, 'inherited')
      }
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
}

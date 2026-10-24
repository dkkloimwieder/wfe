import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  mkdtemp,
  readdir,
  readFile,
  writeFile,
  rm,
  symlink,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, delimiter } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import {
  createRunArtifacts,
  withArtifactRun,
  artifactPath,
  currentArtifacts,
  artifactMode,
} from '../../scripts/artifacts.mjs'
import { finalizeReport } from '../../examples/shared/browser/runner.mjs'

const execute = promisify(execFile)
const scratch = async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'wfe-artifacts-test-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  return directory
}
const read = async (path) => JSON.parse(await readFile(path, 'utf8'))

test('run identities isolate repetitions and every existing mode without deleting evidence', async (t) => {
  const base = await scratch(t)
  const historical = join(base, 'historical.txt')
  await writeFile(historical, 'keep')
  const paths = []
  for (const mode of ['source', 'package', 'development'])
    for (const hydration of [false, true])
      for (let repeat = 0; repeat < 2; repeat++) {
        const run = await createRunArtifacts({
          suite: 'fixture',
          base,
          mode,
          hydration,
          cwd: base,
          revisionRoot: base,
        })
        paths.push(run.directory)
        await run.finish()
        const manifest = await read(run.manifestPath)
        assert.equal(manifest.mode, mode)
        assert.equal(manifest.hydration, hydration)
        assert.equal(manifest.status, 'passed')
        assert.equal(manifest.runtime.node, process.version)
        assert.ok(Array.isArray(manifest.command))
        assert.equal(manifest.revision.head, null)
        assert.ok(manifest.revision.unavailable)
      }
  assert.equal(new Set(paths).size, 12)
  await assert.rejects(
    createRunArtifacts({ suite: '..', base }),
    /Invalid artifact suite/,
  )
  assert.equal(await readFile(historical, 'utf8'), 'keep')
  assert.equal(
    artifactMode({ BENCH_DISTRIBUTION: '1', BENCH_DEVELOPMENT: '1' }),
    'development',
  )
})

test('explicit report ownership is exclusive and a collision keeps the original file plus failing evidence', async (t) => {
  const base = await scratch(t)
  const requestedOutput = join(base, 'requested.json')
  let first
  await withArtifactRun(
    { suite: 'fixture', base, cwd: base, revisionRoot: base, requestedOutput },
    async (run) => {
      first = run
      await finalizeReport({
        report: { cases: ['first'] },
        cleanup: [],
        output: run.reportPath,
        log: () => {},
      })
    },
  )
  const original = await readFile(requestedOutput, 'utf8')
  await assert.rejects(
    withArtifactRun(
      {
        suite: 'fixture',
        base,
        cwd: base,
        revisionRoot: base,
        requestedOutput,
      },
      async () => assert.fail('must not start'),
    ),
    { code: 'EEXIST' },
  )
  assert.equal(await readFile(requestedOutput, 'utf8'), original)
  assert.equal((await read(first.manifestPath)).status, 'passed')
  const directories = await readdir(join(base, 'fixture'))
  assert.equal(directories.length, 2)
  const second = join(
    base,
    'fixture',
    directories.find((name) => !first.directory.endsWith(name)),
  )
  assert.equal((await read(join(second, 'manifest.json'))).status, 'failed')
  assert.match((await read(join(second, 'report.json'))).failure, /EEXIST/)
})

test('attachments remain in their context, allocate fresh names and reject traversal or existing requested files', async (t) => {
  const base = await scratch(t)
  const requested = join(base, 'requested.png')
  let directory, retained
  await withArtifactRun(
    {
      suite: 'fixture',
      base,
      cwd: base,
      revisionRoot: base,
      requestedOutput: undefined,
    },
    async (run) => {
      directory = run.directory
      retained = run
      const concurrent = await Promise.all([
        artifactPath('parallel-a.txt'),
        artifactPath('parallel-b.txt'),
      ])
      assert.equal(new Set(concurrent).size, 2)
      const first = await artifactPath('images/example.png')
      const second = await artifactPath('images/example.png')
      assert.notEqual(first, second)
      await assert.rejects(artifactPath('../outside.txt'), /escapes/)
      await assert.rejects(
        artifactPath('/outside.txt'),
        /Invalid artifact name/,
      )
      await symlink(base, join(run.directory, 'external'), 'dir')
      await assert.rejects(artifactPath('external/escape.txt'), /symlink/)
      const alias = await artifactPath('images/requested.png', requested)
      await writeFile(alias, 'image bytes')
      await assert.rejects(artifactPath('images/again.png', requested), {
        code: 'EEXIST',
      })
    },
  )
  await assert.rejects(retained.attachment('late.txt'), /already finalized/)
  const manifest = await read(join(directory, 'manifest.json'))
  const image = manifest.attachments.find(
    (item) => item.requestedPath === requested,
  )
  assert.equal(await readFile(image.path, 'utf8'), 'image bytes')
  assert.equal(await readFile(requested, 'utf8'), 'image bytes')
  await assert.rejects(artifactPath('unowned.txt'), /owned run context/)
})

test('nested and concurrent async contexts restore their caller and child processes inherit no context', async (t) => {
  const base = await scratch(t)
  const options = (suite) => ({
    suite,
    base,
    cwd: base,
    revisionRoot: base,
    requestedOutput: undefined,
  })
  await Promise.all(
    ['first', 'second'].map((suite) =>
      withArtifactRun(options(suite), async (parent) => {
        await Promise.resolve()
        assert.equal(currentArtifacts(), parent)
        await withArtifactRun(options('nested-' + suite), async (child) => {
          assert.notEqual(child.directory, parent.directory)
          assert.equal(currentArtifacts(), child)
        })
        assert.equal(currentArtifacts(), parent)
        const module = new URL('../../scripts/artifacts.mjs', import.meta.url)
          .href
        const { stdout } = await execute(process.execPath, [
          '--input-type=module',
          '-e',
          `import { currentArtifacts } from ${JSON.stringify(module)}; console.log(currentArtifacts() === undefined)`,
        ])
        assert.equal(stdout.trim(), 'true')
      }),
    ),
  )
  assert.equal(currentArtifacts(), undefined)
})

test('failure reports survive cleanup and output failures in the canonical directory', async (t) => {
  const base = await scratch(t)
  let directory
  await withArtifactRun(
    {
      suite: 'fixture',
      base,
      cwd: base,
      revisionRoot: base,
      requestedOutput: undefined,
    },
    async (run) => {
      directory = run.directory
      const report = { failure: 'original assertion failed' }
      const failed = await finalizeReport({
        report,
        output: run.reportPath,
        cleanup: [
          {
            name: 'resource',
            close: () => {
              throw new Error('cleanup failed')
            },
          },
        ],
        write: async () => {
          throw new Error('external output failed')
        },
        log: () => {},
      })
      assert.equal(failed, true)
    },
  )
  const report = await read(join(directory, 'report.json'))
  assert.equal(report.failure, 'original assertion failed')
  assert.equal(report.cleanupFailures[0].name, 'resource')
  assert.equal(report.outputFailure.message, 'external output failed')
  assert.equal((await read(join(directory, 'manifest.json'))).status, 'failed')
})

test('a thrown operation remains primary when artifact finalization also fails', async (t) => {
  const base = await scratch(t)
  const primary = new Error('operation failed')
  await assert.rejects(
    withArtifactRun(
      {
        suite: 'fixture',
        base,
        cwd: base,
        revisionRoot: base,
        requestedOutput: undefined,
      },
      async (run) => {
        run.finish = async () => {
          throw new Error('manifest failed')
        }
        throw primary
      },
    ),
    (error) => {
      assert.ok(error instanceof AggregateError)
      assert.equal(error.errors[0], primary)
      assert.equal(error.cause, primary)
      assert.equal(error.errors[1].message, 'manifest failed')
      return true
    },
  )
})

test('qualification plan is read-only and describes a unique destination without creating one', async (t) => {
  const base = await scratch(t)
  const output = join(base, 'not-created')
  const script = new URL('../../scripts/qualify.mjs', import.meta.url)
  const { stdout } = await execute(
    process.execPath,
    [fileURLToPath(script), '--plan'],
    { env: { ...process.env, QUALIFICATION_OUTPUT: output } },
  )
  const stages = JSON.parse(stdout)
  assert.ok(stages.length > 0)
  assert.ok(
    stages.some((stage) => stage.env?.BENCH_OUTPUT?.includes('<unique-run>')),
  )
  assert.deepEqual(await readdir(base), [])
})

test('qualification preserves the first failed command and unique evidence without touching an inherited report', async (t) => {
  const base = await scratch(t)
  const commands = join(base, 'commands.json')
  const inherited = join(base, 'historical-report.json')
  await writeFile(inherited, 'historical bytes')
  await writeFile(
    join(base, 'pnpm'),
    `#!/usr/bin/env node
const fs = require('node:fs')
fs.appendFileSync(process.env.WFE_ARTIFACT_COMMANDS, JSON.stringify(process.argv.slice(2)))
process.exit(7)
`,
    { mode: 0o755 },
  )
  const output = join(base, 'runs')
  const script = new URL('../../scripts/qualify.mjs', import.meta.url)
  await assert.rejects(
    execute(process.execPath, [fileURLToPath(script)], {
      env: {
        ...process.env,
        PATH: base + delimiter + process.env.PATH,
        QUALIFICATION_OUTPUT: output,
        WFE_ARTIFACT_COMMANDS: commands,
        BENCH_OUTPUT: inherited,
      },
    }),
    (error) => error.code === 1,
  )
  assert.deepEqual(JSON.parse(await readFile(commands, 'utf8')), [
    'run',
    'check',
  ])
  assert.equal(await readFile(inherited, 'utf8'), 'historical bytes')
  const runs = await readdir(join(output, 'qualification'))
  assert.equal(runs.length, 1)
  const directory = join(output, 'qualification', runs[0])
  const report = await read(join(directory, 'report.json'))
  const manifest = await read(join(directory, 'manifest.json'))
  assert.equal(report.firstFailure, 'checks')
  assert.equal(report.stages.length, 1)
  assert.equal(report.stages[0].status, 7)
  assert.equal(manifest.status, 'failed')
  assert.ok(manifest.command.includes(fileURLToPath(script)))
})

for (const failureKind of ['copy', 'stat'])
  test(`attachment ${failureKind} failures finalize the manifest and preserve the operation error`, async (t) => {
    const base = await scratch(t)
    const primary = new Error('operation failed before attachment finalization')
    let directory, missing
    await assert.rejects(
      withArtifactRun(
        {
          suite: 'fixture',
          base,
          cwd: base,
          revisionRoot: base,
          requestedOutput: undefined,
        },
        async (run) => {
          directory = run.directory
          missing = await run.attachment(
            'attachment.txt',
            failureKind === 'copy'
              ? join(base, 'requested-attachment.txt')
              : undefined,
          )
          await rm(missing)
          throw primary
        },
      ),
      (error) => {
        assert.ok(error instanceof AggregateError)
        assert.equal(error.cause, primary)
        assert.equal(error.errors[0], primary)
        const finalization = error.errors[1]
        assert.ok(finalization instanceof AggregateError)
        assert.equal(finalization.message, 'Run artifact finalization failed')
        assert.equal(finalization.errors.length, 1)
        assert.equal(finalization.errors[0].code, 'ENOENT')
        assert.equal(finalization.errors[0].path, missing)
        return true
      },
    )
    const manifest = await read(join(directory, 'manifest.json'))
    assert.equal(manifest.status, 'failed')
    assert.ok(manifest.finishedAt)
    assert.equal(manifest.failure.message, primary.message)
    assert.equal(manifest.artifactFailures.length, 1)
    assert.equal(manifest.artifactFailures[0].code, 'ENOENT')
    assert.ok(manifest.artifactFailures[0].message.includes(missing))
    const report = await read(join(directory, 'report.json'))
    assert.equal(report.failureDetails.message, primary.message)
  })

test('nested run failures do not taint a successful parent or sibling through the CLI exit code', async (t) => {
  const base = await scratch(t)
  const previousExit = process.exitCode
  const runs = {}
  const options = (suite) => ({
    suite,
    base,
    cwd: base,
    revisionRoot: base,
    requestedOutput: undefined,
  })
  try {
    process.exitCode = 7
    await withArtifactRun(options('parent'), async (parent) => {
      runs.parent = parent
      await withArtifactRun(options('failed-child'), async (child) => {
        runs.failed = child
        await child.writeReport({ failure: '' })
      })
      await withArtifactRun(options('clean-child'), async (child) => {
        runs.clean = child
        await child.writeReport({ cases: ['completed'] })
      })
      await parent.writeReport({ cases: ['parent completed'] })
    })
    assert.equal(
      process.exitCode,
      7,
      'artifact ownership does not reset caller CLI state',
    )
    assert.equal((await read(runs.failed.manifestPath)).status, 'failed')
    assert.equal((await read(runs.clean.manifestPath)).status, 'passed')
    assert.equal((await read(runs.parent.manifestPath)).status, 'passed')
  } finally {
    process.exitCode = previousExit
  }
})

test('concurrent qualification failure reports preserve their own outcome without tainting other runs', async (t) => {
  const base = await scratch(t)
  const previousExit = process.exitCode
  const runs = {}
  const options = (suite) => ({
    suite,
    base,
    cwd: base,
    revisionRoot: base,
    requestedOutput: undefined,
  })
  let release
  const failedReportWritten = new Promise((resolve) => {
    release = resolve
  })
  try {
    await Promise.all([
      withArtifactRun(options('failed'), async (run) => {
        runs.failed = run
        await run.writeReport({
          firstFailure: 'build',
        })
        process.exitCode = 9
        release()
      }),
      withArtifactRun(options('clean'), async (run) => {
        runs.clean = run
        await failedReportWritten
        await run.writeReport({ stages: [{ name: 'build', status: 0 }] })
      }),
    ])
    assert.equal(process.exitCode, 9)
    assert.equal((await read(runs.failed.manifestPath)).status, 'failed')
    assert.equal((await read(runs.clean.manifestPath)).status, 'passed')
    await withArtifactRun(options('failed-stage-only'), async (run) => {
      runs.stageOnly = run
      await run.writeReport({
        stages: [{ name: 'interrupted', status: null, signal: 'SIGTERM' }],
      })
    })
    assert.equal((await read(runs.stageOnly.manifestPath)).status, 'failed')
  } finally {
    release()
    process.exitCode = previousExit
  }
})

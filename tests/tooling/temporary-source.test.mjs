import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  rmSync,
  chmodSync,
  statSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { withTemporarySource } from '../../scripts/temporary-source.mjs'

async function fixture(work) {
  const directory = mkdtempSync(join(tmpdir(), 'wfe-source-edit-'))
  const file = join(directory, 'source.css'),
    backup = join(directory, 'original.css')
  const original = 'Original bytes: é\r\n'
  writeFileSync(file, original)
  chmodSync(file, 0o640)
  try {
    await work({ file, backup, original })
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

test('temporary edits restore exact bytes and permissions after both write styles', () =>
  fixture(async ({ file, backup, original }) => {
    await withTemporarySource(file, backup, async (edit) => {
      for (const method of ['atomic', 'in-place', 'atomic']) {
        edit.write(method, method)
        assert.equal(readFileSync(file, 'utf8'), method)
        assert.equal(statSync(file).mode & 0o777, 0o640)
      }
    })
    assert.equal(readFileSync(file, 'utf8'), original)
    assert.equal(readFileSync(backup, 'utf8'), original)
    assert.equal(statSync(file).mode & 0o777, 0o640)
  }))

test('temporary edits restore source when the callback fails', () =>
  fixture(async ({ file, backup, original }) => {
    const failure = new Error('Probe failed')
    await assert.rejects(
      withTemporarySource(file, backup, (edit) => {
        edit.write('probe', 'atomic')
        throw failure
      }),
      (error) => error === failure,
    )
    assert.equal(readFileSync(file, 'utf8'), original)
  }))

test('temporary edits retain unexpected concurrent changes and the original backup', () =>
  fixture(async ({ file, backup, original }) => {
    await assert.rejects(
      withTemporarySource(file, backup, (edit) => {
        edit.write('probe', 'in-place')
        writeFileSync(file, 'User edit')
      }),
      /Refuse to overwrite unexpected source/,
    )
    assert.equal(readFileSync(file, 'utf8'), 'User edit')
    assert.equal(readFileSync(backup, 'utf8'), original)
  }))

test('temporary edits retain the first failure when restoration refuses a concurrent edit', () =>
  fixture(async ({ file, backup }) => {
    const first = new Error('First failure')
    await assert.rejects(
      withTemporarySource(file, backup, (edit) => {
        edit.write('probe', 'atomic')
        writeFileSync(file, 'User edit')
        throw first
      }),
      (error) =>
        error instanceof AggregateError &&
        error.errors[0] === first &&
        /unexpected source/.test(String(error.errors[1])),
    )
    assert.equal(readFileSync(file, 'utf8'), 'User edit')
  }))

test('SIGINT restores source before the child exits', { timeout: 10000 }, () =>
  fixture(async ({ file, backup, original }) => {
    const helper = new URL(
      '../../scripts/temporary-source.mjs',
      import.meta.url,
    ).href
    const child = spawn(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `import {withTemporarySource} from ${JSON.stringify(helper)}; await withTemporarySource(process.argv[1],process.argv[2],async edit=>{edit.write('probe','atomic');process.stdout.write('ready');await new Promise(()=>setInterval(()=>{},1000))})`,
        file,
        backup,
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    )
    const exited = once(child, 'exit')
    try {
      await once(child.stdout, 'data')
      child.kill('SIGINT')
      const [code, signal] = await exited
      assert.ok(code !== 0 || signal === 'SIGINT')
      assert.equal(readFileSync(file, 'utf8'), original)
    } finally {
      child.kill('SIGKILL')
    }
  }),
)

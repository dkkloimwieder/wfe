import assert from 'node:assert/strict'
import {
  chmodSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'

/** Restore exact source bytes, while preserving any unexpected concurrent edit. */
export async function withTemporarySource(file, backup, work) {
  const original = readFileSync(file)
  const mode = statSync(file).mode & 0o777
  const temporary = `${file}.${randomUUID()}.tmp`
  mkdirSync(dirname(backup), { recursive: true })
  writeFileSync(backup, original, { flag: 'wx' })
  let expected = original
  let closed = false
  const atomicWrite = (value) => {
    writeFileSync(temporary, value, { flag: 'wx', mode })
    chmodSync(temporary, mode)
    renameSync(temporary, file)
  }
  const guard = () => {
    assert.ok(
      readFileSync(file).equals(expected),
      `Refuse to overwrite unexpected source contents: ${file}. Original backup: ${backup}`,
    )
  }
  const restore = () => {
    if (readFileSync(file).equals(original)) {
      closed = true
      return
    }
    guard()
    atomicWrite(original)
    expected = original
    closed = true
  }
  const signals = new Map()
  const removeSignals = () => {
    for (const [signal, listener] of signals) process.off(signal, listener)
  }
  for (const signal of ['SIGINT', 'SIGTERM']) {
    const listener = () => {
      try {
        restore()
      } catch (error) {
        console.error(error)
      } finally {
        removeSignals()
        rmSync(temporary, { force: true })
      }
      if (!process.listenerCount(signal)) process.kill(process.pid, signal)
    }
    signals.set(signal, listener)
    // Restore synchronously before Playwright's process-exit handlers run.
    process.prependListener(signal, listener)
  }
  let result
  let failure
  const cleanupErrors = []
  let failed = false
  try {
    result = await work({
      original: original.toString('utf8'),
      write(value, method) {
        assert.ok(!closed, 'Temporary source editor is closed')
        assert.ok(['atomic', 'in-place'].includes(method))
        guard()
        const next = Buffer.from(value)
        if (method === 'atomic') atomicWrite(next)
        else writeFileSync(file, next)
        expected = next
      },
    })
  } catch (error) {
    failure = error
    failed = true
  } finally {
    removeSignals()
    try {
      restore()
    } catch (error) {
      cleanupErrors.push(error)
    } finally {
      try {
        rmSync(temporary, { force: true })
      } catch (error) {
        cleanupErrors.push(error)
      }
    }
  }
  if (!failed && cleanupErrors.length === 1) throw cleanupErrors[0]
  if (cleanupErrors.length)
    throw new AggregateError(
      failed ? [failure, ...cleanupErrors] : cleanupErrors,
      'Temporary source cleanup failed',
    )
  if (failed) throw failure
  return result
}

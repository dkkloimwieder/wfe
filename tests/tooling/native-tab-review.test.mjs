import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { test } from 'node:test'
import { reviewNativeTab } from '../../examples/shared/controls/button-link-review.mjs'

const events = ['page', 'request', 'requestfinished', 'requestfailed']
function fixture() {
  const context = new EventEmitter()
  const existing = () => {}
  for (const event of events) context.on(event, existing)
  return {
    context,
    existing,
    page: {
      context: () => context,
      url: () => 'https://example.test/original',
    },
  }
}
function assertContextClean(context, existing) {
  for (const event of events)
    assert.deepEqual(context.listeners(event), [existing])
}

test('native-tab review removes its waiter and timer after an early click failure', async (t) => {
  const { context, existing, page } = fixture()
  const timers = [],
    cleared = []
  const schedule = globalThis.setTimeout,
    cancel = globalThis.clearTimeout
  t.mock.method(globalThis, 'setTimeout', (...args) => {
    const timer = schedule(...args)
    timers.push(timer)
    return timer
  })
  t.mock.method(globalThis, 'clearTimeout', (timer) => {
    cleared.push(timer)
    cancel(timer)
  })
  const cause = new Error('click failed before a tab opened')
  await assert.rejects(
    reviewNativeTab(
      page,
      async () => {
        throw cause
      },
      'about:blank',
    ),
    (error) => {
      assert.equal(error.cause, cause)
      assert.match(String(error), /click failed before a tab opened/)
      return true
    },
  )
  assertContextClean(context, existing)
  assert.equal(timers.length, 1)
  assert.ok(timers.every((timer) => cleared.includes(timer)))
})

test('native-tab review preserves destination and cleanup failures and removes its listeners', async () => {
  const { context, existing, page } = fixture()
  const popup = new EventEmitter()
  const primary = new Error('destination did not match')
  const cleanup = new Error('tab close failed')
  let closes = 0
  Object.assign(popup, {
    url: () => 'https://example.test/destination',
    waitForURL: async () => {},
    isClosed: () => false,
    close: async () => {
      closes++
      throw cleanup
    },
  })
  await assert.rejects(
    reviewNativeTab(
      page,
      async () => {
        context.emit('page', popup)
      },
      popup.url(),
      async () => {
        throw primary
      },
    ),
    (error) => {
      assert.ok(error instanceof AggregateError)
      assert.equal(error.errors[0].cause, primary)
      assert.equal(error.errors[1], cleanup)
      assert.match(String(error), /destination did not match/)
      assert.match(String(error), /tab close failed/)
      return true
    },
  )
  assert.equal(closes, 1)
  assertContextClean(context, existing)
  assert.equal(popup.listenerCount('domcontentloaded'), 0)
  assert.equal(popup.listenerCount('load'), 0)
})

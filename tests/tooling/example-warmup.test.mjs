import assert from 'node:assert/strict'
import { test } from 'node:test'
import { warmupExample } from '../../examples/shared/browser/warmup.mjs'

test('example warmup waits for the entry and its static import graph', async () => {
  const events = []
  let transform, idle
  const result = warmupExample({
    environments: {
      client: {
        moduleGraph: {
          idToModuleMap: new Map([
            ['entry', {}],
            ['child', {}],
          ]),
        },
        transformRequest: (entry) => {
          events.push(entry)
          return new Promise((resolve) => {
            transform = resolve
          })
        },
        waitForRequestsIdle: () => {
          events.push('imports')
          return new Promise((resolve) => {
            idle = resolve
          })
        },
      },
    },
  })
  assert.deepEqual(events, ['/main.tsx'])
  transform({ code: 'entry' })
  await Promise.resolve()
  assert.deepEqual(events, ['/main.tsx', 'imports'])
  idle()
  const report = await result
  assert.equal(report.modules, 2)
  assert.equal(report.entry, '/main.tsx')
  assert.ok(Number.isFinite(report.elapsed))
})

for (const phase of ['entry', 'imports', 'missing']) {
  test(`example warmup preserves ${phase} failures`, async () => {
    const error = new Error(phase)
    const server = {
      environments: {
        client: {
          transformRequest: async () => {
            if (phase === 'entry') throw error
            return phase === 'missing' ? null : { code: 'entry' }
          },
          waitForRequestsIdle: async () => {
            throw error
          },
        },
      },
    }
    await assert.rejects(
      warmupExample(server),
      phase === 'missing'
        ? /Example entry did not transform/
        : (actual) => actual === error,
    )
  })
}

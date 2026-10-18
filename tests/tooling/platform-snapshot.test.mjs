import { test } from 'node:test'
import { execFileSync } from 'node:child_process'
test('captured platform clients, runtime, metadata and validation provenance retain their source bytes', () => {
  execFileSync(process.execPath, ['examples/platform/check-snapshot.mjs'], {
    stdio: 'pipe',
  })
})

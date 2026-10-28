import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import {
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const prepare = fileURLToPath(
  new URL('../../scripts/prepare-package.mjs', import.meta.url),
)

async function fixture(t, dependencies = {}) {
  const workspace = await mkdtemp(join(tmpdir(), 'wfe-prepare-test-'))
  t.after(() => rm(workspace, { recursive: true, force: true }))
  const directory = join(workspace, 'packages/fixture')
  const bin = join(directory, 'node_modules/.bin')
  await mkdir(bin, { recursive: true })
  await mkdir(join(directory, 'src/nested'), { recursive: true })
  await writeFile(
    join(directory, 'package.json'),
    JSON.stringify({ name: '@wfe/fixture', type: 'module', ...dependencies }),
  )
  await writeFile(
    join(directory, 'src/nested/index.ts'),
    'export const n = 1\n',
  )
  await writeFile(join(directory, 'tsdown.config.ts'), 'export default {}\n')
  await writeFile(
    join(bin, 'tsdown'),
    `#!${process.execPath}
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs'
appendFileSync('builds.log', 'build\\n')
mkdirSync('dist', { recursive: true })
writeFileSync('dist/index.js', 'built\\n')
console.log('fixture tsdown build')
process.exitCode = Number(process.env.WFE_PREPARE_TEST_FAIL || 0)
`,
    { mode: 0o755 },
  )
  return {
    directory,
    hash: join(directory, '.tsdown-hash'),
    async sibling(name = '@wfe/dependency') {
      // The directory deliberately differs from the manifest's package name.
      const sibling = join(workspace, 'packages/other-directory')
      await mkdir(sibling, { recursive: true })
      await writeFile(join(sibling, 'package.json'), JSON.stringify({ name }))
      return join(sibling, '.tsdown-hash')
    },
    run(fail = 0) {
      const result = spawnSync(process.execPath, [prepare], {
        cwd: directory,
        encoding: 'utf8',
        env: {
          ...process.env,
          PATH: `${bin}${delimiter}${process.env.PATH}`,
          WFE_PREPARE_TEST_FAIL: String(fail),
        },
      })
      assert.ifError(result.error)
      assert.equal(result.status, fail, result.stderr)
      return result
    },
    async builds() {
      return (await readFile(join(directory, 'builds.log'), 'utf8'))
        .trim()
        .split('\n').length
    },
  }
}

test('an unchanged hash skips the build and names the package', async (t) => {
  const f = await fixture(t)
  assert.match(f.run().stdout, /fixture tsdown build/)
  const hash = await readFile(f.hash, 'utf8')
  assert.match(hash, /^[a-f0-9]{64}\n$/)
  assert.equal(
    f.run().stdout,
    'Prepare: @wfe/fixture unchanged, skipping build\n',
  )
  assert.equal(await f.builds(), 1)
  assert.equal(await readFile(f.hash, 'utf8'), hash)
})

for (const [name, change] of [
  [
    'a changed source file',
    (dir) =>
      writeFile(join(dir, 'src/nested/index.ts'), 'export const n = 2\n'),
  ],
  [
    'a new source file',
    (dir) => writeFile(join(dir, 'src/new.ts'), 'export {}\n'),
  ],
  [
    'a renamed source file',
    (dir) =>
      rename(
        join(dir, 'src/nested/index.ts'),
        join(dir, 'src/nested/renamed.ts'),
      ),
  ],
  ['a deleted source file', (dir) => rm(join(dir, 'src/nested/index.ts'))],
  [
    'changed line endings',
    (dir) =>
      writeFile(join(dir, 'src/nested/index.ts'), 'export const n = 1\r\n'),
  ],
  [
    'a changed tsdown configuration',
    (dir) =>
      writeFile(
        join(dir, 'tsdown.config.ts'),
        'export default { clean: true }\n',
      ),
  ],
  [
    'an additional tsdown configuration',
    (dir) => writeFile(join(dir, 'tsdown.config.mjs'), 'export default {}\n'),
  ],
  [
    'a changed package manifest',
    (dir) =>
      writeFile(
        join(dir, 'package.json'),
        JSON.stringify({
          name: '@wfe/fixture',
          type: 'module',
          version: '1.0.0',
        }),
      ),
  ],
]) {
  test(`${name} rebuilds`, async (t) => {
    const f = await fixture(t)
    f.run()
    const hash = await readFile(f.hash, 'utf8')
    await change(f.directory)
    f.run()
    assert.equal(await f.builds(), 2)
    assert.notEqual(await readFile(f.hash, 'utf8'), hash)
  })
}

test('a deleted dist rebuilds even with an unchanged hash', async (t) => {
  const f = await fixture(t)
  f.run()
  const hash = await readFile(f.hash, 'utf8')
  await rm(join(f.directory, 'dist'), { recursive: true })
  f.run()
  assert.equal(await f.builds(), 2)
  assert.equal(await readFile(f.hash, 'utf8'), hash)
  assert.ok(existsSync(join(f.directory, 'dist/index.js')))
})

test('a missing hash rebuilds even with existing dist', async (t) => {
  const f = await fixture(t)
  f.run()
  await rm(f.hash)
  f.run()
  assert.equal(await f.builds(), 2)
})

for (const field of [
  'dependencies',
  'peerDependencies',
  'devDependencies',
  'optionalDependencies',
]) {
  test(`${field}: a changed dependency hash rebuilds`, async (t) => {
    const f = await fixture(t, {
      [field]: { '@wfe/dependency': 'workspace:*' },
    })
    const dependencyHash = await f.sibling()
    await writeFile(dependencyHash, 'first\n')
    f.run()
    const hash = await readFile(f.hash, 'utf8')
    await writeFile(dependencyHash, 'second\n')
    f.run()
    assert.equal(await f.builds(), 2)
    assert.notEqual(await readFile(f.hash, 'utf8'), hash)
  })

  test(`${field}: an unchanged dependency hash skips`, async (t) => {
    const f = await fixture(t, {
      [field]: { '@wfe/dependency': 'workspace:*' },
    })
    const dependencyHash = await f.sibling()
    await writeFile(dependencyHash, 'first\n')
    f.run()
    await writeFile(dependencyHash, 'first\n')
    assert.match(f.run().stdout, /unchanged, skipping build/)
    assert.equal(await f.builds(), 1)
  })

  test(`${field}: a missing dependency hash rebuilds, then its arrival rebuilds`, async (t) => {
    const f = await fixture(t, {
      [field]: { '@wfe/dependency': 'workspace:*' },
    })
    const dependencyHash = await f.sibling()
    await writeFile(dependencyHash, 'first\n')
    f.run()
    const hash = await readFile(f.hash, 'utf8')
    await rm(dependencyHash)
    f.run()
    const missingHash = await readFile(f.hash, 'utf8')
    assert.notEqual(missingHash, hash)
    assert.equal(await f.builds(), 2)
    assert.match(f.run().stdout, /unchanged, skipping build/)
    assert.equal(await f.builds(), 2)
    await writeFile(dependencyHash, 'first\n')
    f.run()
    assert.equal(await f.builds(), 3)
    assert.equal(await readFile(f.hash, 'utf8'), hash)
  })
}

test('only declared @wfe dependencies with matching siblings affect the hash', async (t) => {
  const f = await fixture(t, {
    dependencies: {
      '@wfe/dependency': 'workspace:*',
      'external-package': '1.0.0',
    },
  })
  const dependencyHash = await f.sibling('external-package')
  f.run()
  await writeFile(dependencyHash, 'external\n')
  assert.match(f.run().stdout, /unchanged, skipping build/)
  await writeFile(
    join(f.directory, '../other-directory/package.json'),
    JSON.stringify({ name: '@wfe/undeclared' }),
  )
  await writeFile(dependencyHash, 'undeclared\n')
  assert.match(f.run().stdout, /unchanged, skipping build/)
  assert.equal(await f.builds(), 1)
})

test('a failed build removes the stale hash and the next run rebuilds', async (t) => {
  const f = await fixture(t)
  f.run()
  // Keep the inputs unchanged so a surviving hash would skip the retry.
  await rm(join(f.directory, 'dist'), { recursive: true })
  f.run(7)
  assert.equal(existsSync(f.hash), false)
  assert.ok(existsSync(join(f.directory, 'dist')))
  f.run()
  assert.equal(await f.builds(), 3)
  assert.ok(existsSync(f.hash))
  f.run()
  assert.equal(await f.builds(), 3)
})

test('a changed declared build helper invalidates the cached build', async (t) => {
  const f = await fixture(t, {
    wfeBuildInputs: ['../../scripts/vendor-transforms.mjs'],
  })
  const scripts = join(f.directory, '../../scripts')
  await mkdir(scripts, { recursive: true })
  const helper = join(scripts, 'vendor-transforms.mjs')
  await writeFile(helper, 'export const version = 1\n')
  f.run()
  assert.match(f.run().stdout, /unchanged, skipping build/)
  await writeFile(helper, 'export const version = 2\n')
  assert.match(f.run().stdout, /fixture tsdown build/)
  assert.equal(await f.builds(), 2)
})

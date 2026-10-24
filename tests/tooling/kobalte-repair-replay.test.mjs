import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm, readFile, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { version } from 'prettier'
import {
  redirectUtils,
  replayKobalte,
} from '../../scripts/kobalte-repair-replay.mjs'

const hash = (value) => createHash('sha256').update(value).digest('hex')
async function fixture(t) {
  const root = await mkdtemp(resolve(tmpdir(), 'wfe-repair-fixture-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const upstream = resolve(root, 'upstream'),
    archive = resolve(root, 'archive.tgz')
  const output = resolve(root, 'evidence'),
    vendor = resolve(root, 'packages/components/src/vendor/kobalte')
  const source = 'core/src/example.ts'
  const original = 'export const value=1;\n',
    local = 'export const value = 2\n'
  for (const dir of [
    resolve(upstream, 'packages/core/src'),
    resolve(vendor, 'core/src'),
  ])
    await mkdir(dir, { recursive: true })
  await writeFile(archive, 'synthetic archive fixture, not upstream evidence')
  await writeFile(resolve(upstream, 'packages', source), original)
  await writeFile(resolve(vendor, source), local)
  await writeFile(
    resolve(upstream, 'LICENSE.md'),
    'unchanged fixture license\n',
  )
  await writeFile(resolve(vendor, 'LICENSE.md'), 'unchanged fixture license\n')
  await writeFile(
    resolve(root, '.prettierrc.json'),
    JSON.stringify({ semi: false, singleQuote: true }),
  )
  await writeFile(
    resolve(root, 'package.json'),
    JSON.stringify({ devDependencies: { prettier: version } }),
  )
  await writeFile(resolve(root, 'pnpm-lock.yaml'), 'fixture lockfile\n')
  const provenance = {
    repository: 'fixture',
    revision: 'fixture',
    archiveSha256: hash(await readFile(archive)),
    sources: {
      [source]: { upstreamSha256: hash(original), localSha256: hash(local) },
      'LICENSE.md': {
        upstreamSha256: hash('unchanged fixture license\n'),
        localSha256: hash('unchanged fixture license\n'),
      },
    },
  }
  await writeFile(
    resolve(vendor, 'provenance.json'),
    JSON.stringify(provenance),
  )
  return { root, upstream, archive, output, vendor, source }
}

test('mechanical redirection changes exact import/export specifiers, not strings or comments', () => {
  const source = `// @kobalte/utils\nimport { value } from '@kobalte/utils'\nexport { type Item } from '@kobalte/utils'\nconst label = '@kobalte/utils'\nimport other from '@kobalte/utils/other'\n`
  const output = redirectUtils(source, 'core/src/choice/input.tsx')
  assert.equal(
    output,
    source.replaceAll(
      "from '@kobalte/utils'",
      "from '../../../utils/src/index.ts'",
    ),
  )
})

test('verified originals replay formatting and residual repairs without changing either input tree', async (t) => {
  const options = await fixture(t)
  const before = await readFile(resolve(options.vendor, options.source))
  const { directory, report } = await replayKobalte(options)
  assert.equal(report.replay, 'passed')
  assert.deepEqual(
    report.stages.map((stage) => stage.name),
    [
      '01-formatting.patch',
      '02-utils-import-paths.patch',
      '03-residual-repairs.patch',
    ],
  )
  assert.equal(
    report.files.find((file) => file.path === options.source).residual,
    true,
  )
  assert.equal(
    report.files.find((file) => file.path === 'LICENSE.md').residual,
    false,
  )
  assert.deepEqual(
    await readFile(resolve(directory, 'replayed', options.source)),
    before,
  )
  assert.deepEqual(
    await readFile(resolve(options.vendor, options.source)),
    before,
  )
  assert.equal(
    await readFile(
      resolve(options.upstream, 'packages', options.source),
      'utf8',
    ),
    'export const value=1;\n',
  )
})

for (const corruption of ['archive', 'original', 'local'])
  test(`replay rejects a changed ${corruption} before producing comparison evidence`, async (t) => {
    const options = await fixture(t)
    const target =
      corruption === 'archive'
        ? options.archive
        : corruption === 'original'
          ? resolve(options.upstream, 'packages', options.source)
          : resolve(options.vendor, options.source)
    await writeFile(target, 'tampered\n')
    await assert.rejects(
      replayKobalte(options),
      new RegExp(
        corruption === 'archive'
          ? 'Pinned archive hash'
          : corruption === 'original'
            ? 'Original hash'
            : 'Local hash',
      ),
    )
    await assert.rejects(stat(options.output), {
      code: 'ENOENT',
    })
  })

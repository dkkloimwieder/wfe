import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import {
  componentDeliveryModes,
  copyVendorNotices,
  vendorNotices,
  vendorNoticePaths,
  verifyVendorNotices,
} from '../scripts/lib/vendor-notices.mjs'

const packageRoot = fileURLToPath(
  new URL('../packages/components/', import.meta.url),
)
const source = resolve(packageRoot, 'src')

async function noticesIn(directory, prefix = 'vendor') {
  const result = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${prefix}/${entry.name}`
    if (entry.isDirectory())
      result.push(...(await noticesIn(resolve(directory, entry.name), path)))
    else if (/^(LICENSE|NOTICE)([.-].*)?$/i.test(entry.name)) result.push(path)
  }
  return result.sort()
}

test('all six captured subsets and every source notice are represented', async () => {
  assert.deepEqual(Object.keys(vendorNotices).sort(), [
    'calendar',
    'charts',
    'icons',
    'kobalte',
    'matching',
    'virtual',
  ])
  assert.deepEqual(
    await noticesIn(resolve(source, 'vendor')),
    [...vendorNoticePaths].sort(),
  )
  assert.equal(new Set(vendorNoticePaths).size, vendorNoticePaths.length)
})

test('copy and verification preserve notice bytes and reject corruption or missing output', async () => {
  const directory = await mkdtemp(resolve(tmpdir(), 'wfe-notice-copy-'))
  try {
    const outputs = componentDeliveryModes.map((mode) =>
      resolve(directory, mode),
    )
    await copyVendorNotices(source, outputs)
    await verifyVendorNotices(source, outputs)
    const path = resolve(outputs[0], vendorNoticePaths[0])
    await writeFile(path, 'not the original notice\n')
    await assert.rejects(
      verifyVendorNotices(source, outputs),
      /Vendor notice bytes differ/,
    )
    await rm(path)
    await assert.rejects(verifyVendorNotices(source, outputs), {
      code: 'ENOENT',
    })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('built and locally packed components deliver every notice in every output mode', async () => {
  // The normal check gate builds first. Never invoke a second build from this test.
  await verifyVendorNotices(
    source,
    componentDeliveryModes.map((mode) => resolve(packageRoot, 'dist', mode)),
  )
  const directory = await mkdtemp(resolve(tmpdir(), 'wfe-notice-pack-'))
  try {
    const archive = resolve(directory, 'components.tgz')
    execFileSync(
      'pnpm',
      [
        '--config.ignore-scripts=true',
        'pack',
        '--out',
        archive,
        '--pack-gzip-level',
        '0',
      ],
      { cwd: packageRoot, stdio: 'pipe' },
    )
    const extracted = resolve(directory, 'unpacked')
    await mkdir(extracted)
    execFileSync('tar', ['-xzf', archive, '-C', extracted], { stdio: 'pipe' })
    const manifest = JSON.parse(
      await readFile(resolve(extracted, 'package/package.json'), 'utf8'),
    )
    assert.equal(manifest.name, '@wfe/components')
    await verifyVendorNotices(
      source,
      componentDeliveryModes.map((mode) =>
        resolve(extracted, 'package/dist', mode),
      ),
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

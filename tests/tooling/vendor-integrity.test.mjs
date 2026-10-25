import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  mkdtemp,
  mkdir,
  cp,
  writeFile,
  readFile,
  rm,
  symlink,
  rename,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import {
  checkVendorIntegrity,
  exactFiles,
} from '../../scripts/lib/vendor-integrity.mjs'
import { checkRuntimePatches } from '../../scripts/lib/runtime-patches.mjs'
const source = fileURLToPath(new URL('../../', import.meta.url))
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
async function scratch(t) {
  const root = await mkdtemp(join(tmpdir(), 'wfe-vendor-integrity-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  return root
}
async function vendor(t) {
  const root = await scratch(t)
  for (const name of [
    'packages/components/src/vendor',
    'packages/components/src/icons',
    'packages/components/src/internal',
    'packages/components/src/theme',
    'packages/components/src/utils',
    'packages/components/package.json',
  ]) {
    await mkdir(dirname(resolve(root, name)), { recursive: true })
    await cp(resolve(source, name), resolve(root, name), { recursive: true })
  }
  return root
}

test('exact inventory rejects arbitrary extensions, nested support names, missing files and symlinks', async (t) => {
  const root = await scratch(t)
  await writeFile(join(root, 'captured.ts'), '')
  await exactFiles(root, ['captured.ts'])
  for (const name of [
    'extra.js',
    'extra.json',
    'extra.bin',
    'nested/README.md',
  ]) {
    await mkdir(dirname(join(root, name)), { recursive: true })
    await writeFile(join(root, name), '')
    await assert.rejects(exactFiles(root, ['captured.ts']), /inventory/)
    await rm(join(root, name))
  }
  await symlink(join(root, 'captured.ts'), join(root, 'link.ts'))
  await assert.rejects(exactFiles(root, ['captured.ts', 'link.ts']), /Symlink/)
  await rm(join(root, 'link.ts'))
  await assert.rejects(
    exactFiles(root, ['captured.ts', 'missing.ts']),
    /inventory/,
  )
  await assert.rejects(exactFiles(root, ['../outside']), /Unsafe/)
})

test('vendor local and license modifications fail without matching evidence', async (t) => {
  const root = await vendor(t)
  await checkVendorIntegrity(root)
  const file = resolve(
    root,
    'packages/components/src/vendor/virtual-core/utils.ts',
  )
  const bytes = await readFile(file)
  await writeFile(file, Buffer.concat([bytes, Buffer.from('\n// changed\n')]))
  await assert.rejects(checkVendorIntegrity(root), /local hash/)
  await writeFile(file, bytes)
  const license = resolve(root, 'packages/components/src/vendor/charts/LICENSE')
  await writeFile(license, 'changed')
  await assert.rejects(checkVendorIntegrity(root), /local hash|license/)
})

test('virtual maps must agree and captured imports cannot escape or become nonliteral', async (t) => {
  const root = await vendor(t)
  const folder = resolve(root, 'packages/components/src/vendor/virtual-core')
  const path = join(folder, 'provenance.json')
  const original = JSON.parse(await readFile(path, 'utf8'))
  const extra = structuredClone(original)
  extra.localSha256['hidden.ts'] = '0'.repeat(64)
  await writeFile(path, JSON.stringify(extra))
  await assert.rejects(checkVendorIntegrity(root), /same entries/)
  for (const statement of [
    'import "../corvu-calendar/utils"',
    'import("./" + name)',
    'export * from "../../../escape"',
    'type External = import("external-package").Value',
  ]) {
    const bytes = Buffer.from(statement)
    await writeFile(join(folder, 'utils.ts'), bytes)
    const changed = structuredClone(original)
    changed.localSha256['utils.ts'] = hash(bytes)
    await writeFile(path, JSON.stringify(changed))
    await assert.rejects(checkVendorIntegrity(root), /import|Import/)
  }
})

test('DnD capture permits only its pinned signal dependency and rejects altered repair evidence', async (t) => {
  const root = await vendor(t)
  const folder = resolve(root, 'packages/components/src/vendor/dnd-kit')
  const manifestPath = join(folder, 'provenance.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  const packagePath = resolve(root, 'packages/components/package.json')
  const pkg = JSON.parse(await readFile(packagePath, 'utf8'))
  await checkVendorIntegrity(root)

  await writeFile(
    packagePath,
    JSON.stringify({
      ...pkg,
      dependencies: { ...pkg.dependencies, '@preact/signals-core': '^1.10.0' },
    }),
  )
  await assert.rejects(checkVendorIntegrity(root), /signal dependency pin/)
  await writeFile(packagePath, JSON.stringify(pkg))

  const repairs = join(folder, 'repairs.patch')
  const repairBytes = await readFile(repairs)
  await writeFile(
    repairs,
    Buffer.concat([repairBytes, Buffer.from('\nchanged\n')]),
  )
  await assert.rejects(checkVendorIntegrity(root), /repair bytes/)
  await writeFile(repairs, repairBytes)

  const name = Object.keys(manifest.sources).find((path) =>
    path.endsWith('.ts'),
  )
  assert.ok(name)
  const path = join(folder, name)
  for (const dependency of [
    'solid-js',
    '@preact/signals-core/internal',
    'tslib',
  ]) {
    const bytes = Buffer.from(`import '${dependency}'\n`)
    const changed = structuredClone(manifest)
    changed.sources[name].localSha256 = hash(bytes)
    await writeFile(path, bytes)
    await writeFile(manifestPath, JSON.stringify(changed))
    await assert.rejects(
      checkVendorIntegrity(root),
      /Unexpected external vendor import/,
    )
  }
})

async function patches(t) {
  const root = await scratch(t)
  for (const name of ['patches', 'pnpm-workspace.yaml', 'pnpm-lock.yaml'])
    await cp(resolve(source, name), resolve(root, name), { recursive: true })
  const manifest = JSON.parse(
    await readFile(resolve(root, 'patches/provenance.json'), 'utf8'),
  )
  await mkdir(resolve(root, 'packages/components'), { recursive: true })
  await writeFile(resolve(root, 'packages/components/package.json'), '{}')
  for (const item of manifest.patches) {
    const from = resolve(
      source,
      'packages/components/node_modules',
      item.package,
    )
    const target = resolve(
      root,
      'packages/components/node_modules',
      item.package,
    )
    await mkdir(dirname(target), { recursive: true })
    await cp(from, target, { recursive: true, dereference: true })
  }
  return { root, manifest }
}
test('patch catalog rejects missing, altered, undeclared and unapplied repairs', async (t) => {
  const { root, manifest } = await patches(t)
  await checkRuntimePatches(root)
  const path = resolve(root, 'patches', manifest.patches[0].patch)
  const bytes = await readFile(path)
  await writeFile(path, 'altered')
  await assert.rejects(checkRuntimePatches(root), /Patch bytes/)
  await writeFile(path, bytes)
  await writeFile(resolve(root, 'patches/extra.patch'), 'extra')
  await assert.rejects(checkRuntimePatches(root), /inventory/)
  await rm(resolve(root, 'patches/extra.patch'))
  const workspace = resolve(root, 'pnpm-workspace.yaml')
  const original = await readFile(workspace)
  await writeFile(
    workspace,
    original
      .toString()
      .replace(
        `  '${manifest.patches[0].package}@${manifest.patches[0].version}': patches/${manifest.patches[0].patch}\n`,
        '',
      ),
  )
  await assert.rejects(checkRuntimePatches(root), /captured evidence/)
  await writeFile(workspace, original)
  const item = manifest.patches[0]
  await writeFile(
    resolve(
      root,
      'packages/components/node_modules',
      item.package,
      item.target,
    ),
    'unapplied',
  )
  await assert.rejects(checkRuntimePatches(root), /Installed repair bytes/)
})

test('patch checks support import-only exports and hoisting without executing package entry points', async (t) => {
  const { root, manifest } = await patches(t)
  const item = manifest.patches[0]
  const local = resolve(root, 'packages/components/node_modules', item.package)
  const hoisted = resolve(root, 'node_modules', item.package)
  const packageFile = resolve(local, 'package.json')
  const pkg = JSON.parse(await readFile(packageFile, 'utf8'))
  pkg.exports = { import: './must-not-execute.js' }
  await writeFile(packageFile, JSON.stringify(pkg))
  await writeFile(
    resolve(local, 'must-not-execute.js'),
    'throw new Error("Do not execute package code")',
  )
  await checkRuntimePatches(root)
  await mkdir(dirname(hoisted), { recursive: true })
  await rename(local, hoisted)
  await checkRuntimePatches(root)
  const hoistedPackage = resolve(hoisted, 'package.json')
  await writeFile(
    hoistedPackage,
    JSON.stringify({ ...pkg, name: 'wrong-package' }),
  )
  await assert.rejects(
    checkRuntimePatches(root),
    /Installed patch package identity/,
  )
  await writeFile(hoistedPackage, JSON.stringify({ ...pkg, version: '0.0.0' }))
  await assert.rejects(
    checkRuntimePatches(root),
    /Installed patch package version/,
  )
})

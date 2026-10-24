import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { exactFiles, hashBytes as hash } from './vendor-guards.mjs'

export async function checkRuntimePatches(root) {
  const manifest = JSON.parse(
    await readFile(resolve(root, 'patches/provenance.json'), 'utf8'),
  )
  assert.equal(manifest.schemaVersion, 1)
  const expected = Object.fromEntries(
    manifest.patches.map((item) => [
      `${item.package}@${item.version}`,
      `patches/${item.patch}`,
    ]),
  )
  assert.equal(
    Object.keys(expected).length,
    manifest.patches.length,
    'Duplicate patch package',
  )
  await exactFiles(resolve(root, 'patches'), [
    'README.md',
    'provenance.json',
    ...manifest.patches.map((item) => item.patch),
  ])
  const workspace = await readFile(resolve(root, 'pnpm-workspace.yaml'), 'utf8')
  const block = workspace.match(
    /^patchedDependencies:\n((?:[ \t].*\n|\n)*)/m,
  )?.[1]
  assert.ok(block, 'Workspace patch declarations are required')
  const declared = {}
  for (const line of block
    .split('\n')
    .filter((line) => line.trim() && !line.trim().startsWith('#'))) {
    const match = line.match(/^ {2}'([^']+)': (\S+)$/)
    assert.ok(match, `Unsupported patch declaration: ${line}`)
    assert.ok(!(match[1] in declared), 'Duplicate workspace patch declaration')
    declared[match[1]] = match[2]
  }
  assert.deepEqual(
    declared,
    expected,
    'Workspace patches match captured evidence',
  )
  const lock = await readFile(resolve(root, 'pnpm-lock.yaml'), 'utf8')
  const require = createRequire(
    resolve(root, 'packages/components/package.json'),
  )
  for (const item of manifest.patches) {
    for (const value of [
      item.patchSha256,
      item.upstreamSha256,
      item.localSha256,
      item.licenseSha256,
      item.archive.sha256,
    ])
      assert.match(value, /^[a-f0-9]{64}$/)
    assert.ok(item.repair.length > 20, 'Patch repair must be identified')
    assert.equal(
      hash(await readFile(resolve(root, 'patches', item.patch))),
      item.patchSha256,
      `Patch bytes: ${item.patch}`,
    )
    assert.ok(
      lock.includes(
        `  '${item.package}@${item.version}':\n    resolution: {integrity: ${item.archive.integrity}}`,
      ),
      'Pinned original archive integrity',
    )
    assert.ok(
      lock.includes(`  '${item.package}@${item.version}': ${item.patchSha256}`),
      'Pinned patch digest',
    )
    let packageRoot
    for (const directory of require.resolve.paths(item.package) ?? []) {
      const candidate = resolve(directory, item.package)
      let pkg
      try {
        pkg = JSON.parse(
          await readFile(resolve(candidate, 'package.json'), 'utf8'),
        )
      } catch (error) {
        if (error.code === 'ENOENT') continue
        throw error
      }
      assert.equal(pkg.name, item.package, 'Installed patch package identity')
      assert.equal(pkg.version, item.version, 'Installed patch package version')
      packageRoot = candidate
      break
    }
    assert.ok(packageRoot, `Installed package not found: ${item.package}`)
    assert.equal(
      hash(await readFile(resolve(packageRoot, item.target))),
      item.localSha256,
      `Installed repair bytes: ${item.package}`,
    )
    assert.equal(
      hash(await readFile(resolve(packageRoot, item.license))),
      item.licenseSha256,
      `Installed upstream license: ${item.package}`,
    )
  }
  return { patches: manifest.patches.length }
}

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, readdir, lstat, realpath } from 'node:fs/promises'
import { resolve, dirname, relative, isAbsolute } from 'node:path'
import ts from 'typescript'
import { vendorInventory } from './vendor-inventory.mjs'

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const source = 'packages/components/src'
export async function exactFiles(root, expected) {
  const names = [...expected].sort()
  assert.equal(new Set(names).size, names.length, 'Duplicate inventory entry')
  for (const name of names) {
    assert.ok(
      name &&
        !isAbsolute(name) &&
        !name.split(/[\\/]/).includes('..') &&
        !name.includes('\\'),
      `Unsafe inventory path: ${name}`,
    )
  }
  const actual = []
  async function walk(directory, prefix = '') {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const name = prefix + entry.name
      assert.ok(!entry.isSymbolicLink(), `Symlink in inventory: ${name}`)
      if (entry.isDirectory())
        await walk(resolve(directory, entry.name), name + '/')
      else {
        assert.ok(entry.isFile(), `Non-file in inventory: ${name}`)
        actual.push(name)
      }
    }
  }
  await walk(root)
  assert.deepEqual(actual.sort(), names, 'Exact captured file inventory')
}

export async function checkVendorIntegrity(root) {
  const inventory = await vendorInventory(root)
  assert.deepEqual(
    Object.keys(inventory.origins.virtual.localSha256).sort(),
    Object.keys(inventory.origins.virtual.upstreamSha256).sort(),
    'Virtual original/local maps must have the same entries',
  )
  const expected = inventory.artifacts
    .filter((item) => item.kind !== 'generated')
    .map((item) => item.path.slice(`${source}/vendor/`.length))
  for (const directory of [
    'kobalte',
    'virtual-core',
    'corvu-calendar',
    'match-sorter',
    'charts',
    'icons',
  ])
    expected.push(`${directory}/provenance.json`, `${directory}/README.md`)
  expected.push('icons/upstream.json')
  await exactFiles(resolve(root, source, 'vendor'), expected)
  const packageJson = JSON.parse(
    await readFile(resolve(root, 'packages/components/package.json'), 'utf8'),
  )
  const external = new Set([
    ...Object.keys(packageJson.dependencies),
    ...Object.keys(packageJson.peerDependencies),
  ])
  const names = new Set(
    inventory.artifacts
      .filter((item) => item.kind !== 'generated')
      .map((item) => item.path),
  )
  for (const item of inventory.artifacts) {
    const bytes = await readFile(resolve(root, item.path))
    assert.equal(
      hash(bytes),
      item.localSha256,
      `Vendor local hash: ${item.path}`,
    )
    if (item.kind === 'license')
      assert.equal(
        item.localSha256,
        item.originals[0].sha256,
        `Unchanged license: ${item.path}`,
      )
    if (!/\.tsx?$/.test(item.path) || item.kind === 'generated') continue
    const ast = ts.createSourceFile(
      item.path,
      bytes.toString(),
      ts.ScriptTarget.Latest,
      true,
    )
    const imports = []
    function inspect(node) {
      const dynamic =
        ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) &&
            node.expression.text === 'require'))
      const specifier =
        ts.isImportDeclaration(node) || ts.isExportDeclaration(node)
          ? node.moduleSpecifier
          : ts.isImportEqualsDeclaration(node) &&
              ts.isExternalModuleReference(node.moduleReference)
            ? node.moduleReference.expression
            : ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)
              ? node.argument.literal
              : dynamic
                ? node.arguments[0]
                : undefined
      if (dynamic)
        assert.ok(specifier, `Missing dynamic import target: ${item.path}`)
      if (specifier) {
        assert.ok(
          ts.isStringLiteral(specifier),
          `Nonliteral vendor import: ${item.path}`,
        )
        imports.push(specifier.text)
      }
      ts.forEachChild(node, inspect)
    }
    inspect(ast)
    for (const imported of imports) {
      if (imported.startsWith('.')) {
        const target = resolve(dirname(resolve(root, item.path)), imported)
        let found
        for (const candidate of [
          target,
          target + '.ts',
          target + '.tsx',
          target + '/index.ts',
          target + '/index.tsx',
        ]) {
          try {
            const info = await lstat(candidate)
            assert.ok(!info.isSymbolicLink(), `Symlink import: ${imported}`)
            if (info.isFile()) {
              found = candidate
              break
            }
          } catch (error) {
            if (error.code !== 'ENOENT') throw error
          }
        }
        assert.ok(found, `Unresolved vendor import: ${item.path}: ${imported}`)
        const actual = await realpath(found)
        assert.equal(
          actual,
          found,
          `Symlink in vendor import path: ${imported}`,
        )
        const local = relative(root, found).replaceAll('\\', '/')
        if (item.family === 'kobalte')
          assert.ok(
            local.startsWith(source + '/'),
            `Kobalte import leaves owned source: ${local}`,
          )
        else
          assert.ok(
            names.has(local) &&
              inventory.classify(local).origin === item.family,
            `Import leaves captured subset: ${item.path}: ${imported}`,
          )
      } else {
        const allowed =
          item.family === 'kobalte'
            ? external
            : item.family === 'charts'
              ? new Set(['d3-scale', 'd3-shape'])
              : new Set()
        assert.ok(
          allowed.has(imported) && !imported.startsWith('@kobalte/'),
          `Unexpected external vendor import: ${item.path}: ${imported}`,
        )
      }
    }
  }
  return { artifacts: inventory.artifacts.length }
}

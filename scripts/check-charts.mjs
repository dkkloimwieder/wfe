import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { dirname, resolve, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

export async function checkCharts(root) {
  const manifest = JSON.parse(
    await readFile(new URL('provenance.json', root), 'utf8'),
  )
  assert.equal(manifest.version, '1.1.0')
  assert.equal(manifest.revision, '57774e14a1a86081eddb3a23523724a40da05640')
  assert.equal(manifest.license, 'MIT')
  const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
  assert.equal(
    hash(await readFile(new URL('LICENSE', root))),
    manifest.licenseSha256,
  )
  const names = new Set(Object.keys(manifest.files))
  const imports = new Map()
  const external = new Set()
  async function visit(directory, prefix = '') {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const name = prefix + entry.name
      if (entry.isDirectory())
        await visit(new URL(entry.name + '/', directory), name + '/')
      else if (name.endsWith('.ts'))
        assert.ok(names.has(name), `Untracked chart source: ${name}`)
    }
  }
  await visit(root)
  for (const [name, item] of Object.entries(manifest.files)) {
    assert.match(item.upstreamSha256, /^[a-f0-9]{64}$/)
    assert.equal(item.source, 'packages/' + name)
    const bytes = await readFile(new URL(name, root))
    assert.equal(hash(bytes), item.localSha256, `Chart source differs: ${name}`)
    if (item.localSha256 !== item.upstreamSha256) {
      assert.equal(item.repair, 'strict-types')
      assert.ok(
        manifest.repairs[name]?.length > 40,
        `Undocumented chart repair: ${name}`,
      )
    }
    const ast = ts.createSourceFile(
      name,
      bytes.toString(),
      ts.ScriptTarget.Latest,
      true,
    )
    const targets = []
    function inspect(node) {
      const specifier =
        ts.isImportDeclaration(node) || ts.isExportDeclaration(node)
          ? node.moduleSpecifier
          : ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)
            ? node.argument.literal
            : ts.isCallExpression(node) &&
                node.expression.kind === ts.SyntaxKind.ImportKeyword
              ? node.arguments[0]
              : undefined
      if (specifier) {
        assert.ok(
          ts.isStringLiteral(specifier),
          `Nonliteral chart import: ${name}`,
        )
        const value = specifier.text
        if (value.startsWith('.')) {
          const target = relative(
            fileURLToPath(root),
            resolve(dirname(fileURLToPath(new URL(name, root))), value),
          ).replaceAll('\\', '/')
          const found = [target, target + '.ts', target + '/index.ts'].find(
            (candidate) => names.has(candidate),
          )
          assert.ok(
            found,
            `Chart import leaves captured source: ${name}: ${value}`,
          )
          targets.push(found)
        } else external.add(value)
      }
      ts.forEachChild(node, inspect)
    }
    inspect(ast)
    imports.set(name, targets)
  }
  assert.deepEqual([...external].sort(), ['d3-scale', 'd3-shape'])
  assert.deepEqual(manifest.externalImports, [...external].sort())
  const reached = new Set()
  function reach(name) {
    assert.ok(names.has(name), `Missing chart entrypoint: ${name}`)
    if (reached.has(name)) return
    reached.add(name)
    imports.get(name).forEach(reach)
  }
  for (const entry of manifest.entrypoints) reach(`charts-core/src/${entry}.ts`)
  assert.equal(
    reached.size,
    names.size,
    'Chart capture contains unreachable source',
  )
  return names.size
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  const count = await checkCharts(
    new URL('../packages/components/src/vendor/charts/', import.meta.url),
  )
  console.log(
    `Checked ${count} owned chart files, import closure, repairs and MIT license`,
  )
}

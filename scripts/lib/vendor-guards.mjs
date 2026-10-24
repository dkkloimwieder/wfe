import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readdir, lstat, realpath } from 'node:fs/promises'
import { resolve, dirname, relative, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

export const hashBytes = (bytes) =>
  createHash('sha256').update(bytes).digest('hex')
const pathOf = (root) =>
  root instanceof URL ? fileURLToPath(root) : resolve(root)

export async function inventoryFiles(root) {
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
  await walk(pathOf(root))
  return actual.sort()
}
export async function exactFiles(root, expected) {
  const names = [...expected].sort()
  assert.equal(new Set(names).size, names.length, 'Duplicate inventory entry')
  for (const name of names)
    assert.ok(
      name &&
        !isAbsolute(name) &&
        !name.split(/[\\/]/).includes('..') &&
        !name.includes('\\'),
      `Unsafe inventory path: ${name}`,
    )
  assert.deepEqual(
    await inventoryFiles(root),
    names,
    'Exact captured file inventory',
  )
}

export function collectLiteralImports(source, name) {
  const ast = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true)
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
    if (dynamic) assert.ok(specifier, `Missing dynamic import target: ${name}`)
    if (specifier) {
      assert.ok(
        ts.isStringLiteral(specifier),
        `Nonliteral vendor import: ${name}`,
      )
      imports.push(specifier.text)
    }
    ts.forEachChild(node, inspect)
  }
  inspect(ast)
  return imports
}

/** Caller supplies the allowed extensions and ownership boundary explicitly. */
export async function resolveRelativeImport(
  importer,
  specifier,
  { extensions, boundary, allowedPaths },
) {
  assert.ok(specifier.startsWith('.'), `Expected relative import: ${specifier}`)
  const target = resolve(dirname(pathOf(importer)), specifier)
  const candidates = [
    target,
    ...extensions.map((extension) => target + extension),
    ...extensions.map((extension) => target + '/index' + extension),
  ]
  let found
  for (const candidate of candidates) {
    if (allowedPaths && !allowedPaths.has(candidate)) continue
    try {
      const info = await lstat(candidate)
      assert.ok(!info.isSymbolicLink(), `Symlink import: ${specifier}`)
      if (info.isFile()) {
        found = candidate
        break
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
  }
  assert.ok(found, `Unresolved captured import: ${importer}: ${specifier}`)
  assert.equal(
    await realpath(found),
    found,
    `Symlink in vendor import path: ${specifier}`,
  )
  const local = relative(pathOf(boundary), found)
  assert.ok(
    local &&
      local !== '..' &&
      !local.startsWith('..' + (process.platform === 'win32' ? '\\' : '/')) &&
      !isAbsolute(local),
    `Import leaves owned boundary: ${importer}: ${specifier}`,
  )
  return found
}

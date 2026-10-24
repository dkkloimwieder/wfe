import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  hashBytes,
  inventoryFiles,
  collectLiteralImports,
  resolveRelativeImport,
} from '../../scripts/lib/vendor-guards.mjs'

test('shared byte hashing does not normalize file content', () => {
  assert.equal(
    hashBytes('abc'),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  )
  assert.equal(hashBytes('abc'), hashBytes(Buffer.from('abc')))
  assert.notEqual(hashBytes('abc\n'), hashBytes('abc\r\n'))
})
test('literal imports retain source order and cover static, export, type, dynamic and require forms', () => {
  const imports = collectLiteralImports(
    'import x from "a"; import "b"; export * from "c"; type X=import("d").X; import("e"); const x=require("f"); import y=require("g");',
    'fixture.ts',
  )
  assert.deepEqual(imports, ['a', 'b', 'c', 'd', 'e', 'f', 'g'])
  for (const source of ['import(name)', 'require(name)', 'import()'])
    assert.throws(() => collectLiteralImports(source, 'bad.ts'), /import/)
})
test('shared import resolution retains explicit extension, captured-path and owner boundaries', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'wfe-vendor-guard-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const inside = join(root, 'inside')
  await mkdir(inside)
  const importer = join(inside, 'index.ts')
  await writeFile(importer, '')
  await writeFile(join(inside, 'view.tsx'), '')
  await writeFile(join(root, 'outside.ts'), '')
  assert.equal(
    await resolveRelativeImport(importer, './view', {
      extensions: ['.tsx'],
      boundary: inside,
    }),
    join(inside, 'view.tsx'),
  )
  await assert.rejects(
    resolveRelativeImport(importer, './view', {
      extensions: ['.ts'],
      boundary: inside,
    }),
    /Unresolved/,
  )
  await assert.rejects(
    resolveRelativeImport(importer, '../outside', {
      extensions: ['.ts'],
      boundary: inside,
    }),
    /boundary/,
  )
  await assert.rejects(
    resolveRelativeImport(importer, './view', {
      extensions: ['.tsx'],
      boundary: inside,
      allowedPaths: new Set(),
    }),
    /Unresolved/,
  )
  await symlink(join(root, 'outside.ts'), join(inside, 'link.ts'))
  await assert.rejects(
    resolveRelativeImport(importer, './link', {
      extensions: ['.ts'],
      boundary: inside,
    }),
    /Symlink/,
  )
  await assert.rejects(inventoryFiles(inside), /Symlink/)
})

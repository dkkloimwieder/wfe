import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  inspectExampleImports,
  exampleImportExceptions,
  checkExampleBoundaries,
} from '../../scripts/check-example-boundaries.mjs'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const file = 'examples/generator/Future.tsx'
test('example boundaries reject sibling imports, exports, dynamic imports and import types', () => {
  for (const statement of [
    "import { View } from '../components/View'",
    "export { View } from '../components/View'",
    "const load = () => import('../components/View')",
    "type View = import('../components/View').View",
  ])
    assert.equal(
      inspectExampleImports(file, statement).errors.length,
      1,
      statement,
    )
  assert.deepEqual(
    inspectExampleImports(
      file,
      "// import '../components/View'\nconst note = \"import '../components/View'\"",
    ).errors,
    [],
  )
})
test('shared content cannot depend back on a consumer and foreign CSS cannot be pulled into a fixture', () => {
  assert.equal(
    inspectExampleImports(
      'examples/shared/controls/Future.tsx',
      "import { View } from '../../components/View'",
    ).errors.length,
    1,
  )
  assert.equal(
    inspectExampleImports(
      'examples/components/main.tsx',
      "import '../generator/style.css'",
    ).errors.length,
    1,
  )
  assert.equal(
    inspectExampleImports(
      'examples/components/style.css',
      "@import '../generator/style.css';",
    ).errors.length,
    1,
  )
  assert.equal(
    inspectExampleImports(
      'examples/components/style.css',
      '@import url(../generator/style.css);',
    ).errors.length,
    1,
  )
  assert.deepEqual(
    inspectExampleImports(
      'examples/components/style.css',
      "/* @import '../generator/style.css'; */ @import '../shared/page-layout.css';",
    ).errors,
    [],
  )
})
test('all four UI packages require public imports in every example consumer', () => {
  for (const pkg of ['components', 'form', 'generator', 'shell']) {
    for (const specifier of [
      `@wfe/${pkg}/internal/model`,
      `../../packages/${pkg}/src/model`,
      `@wfe/${pkg}/dist/index`,
    ])
      assert.equal(
        inspectExampleImports(file, `import X from '${specifier}'`).errors
          .length,
        1,
      )
    assert.deepEqual(
      inspectExampleImports(file, `import { View } from '@wfe/${pkg}'`).errors,
      [],
    )
  }
  assert.deepEqual(
    inspectExampleImports(
      file,
      "import { View } from '../shared/View'; import { Model } from './model'; import { exampleConfig } from '../vite-config.ts'",
    ).errors,
    [],
  )
})
test('documented harness exceptions grant only the exact source and import edge', () => {
  for (const item of exampleImportExceptions) {
    assert.ok(item.reason.length)
    const source = `import * as fixture from '${item.specifier}'`
    const allowed = inspectExampleImports(item.file, source)
    assert.deepEqual(allowed.errors, [])
    assert.equal(allowed.usedExceptions.length, 1)
    assert.equal(
      inspectExampleImports(item.file.replace(/[^/]+$/, 'Other.ts'), source)
        .errors.length,
      1,
    )
    assert.equal(
      inspectExampleImports(
        item.file,
        `import * as fixture from '${item.specifier}-extra'`,
      ).errors.length,
      1,
    )
  }
})
test('unused harness exceptions fail instead of silently accumulating', async () => {
  const root = await mkdtemp(join(tmpdir(), 'wfe-example-boundaries-'))
  try {
    await mkdir(join(root, 'examples/shared'), { recursive: true })
    await writeFile(join(root, 'examples/shared/Empty.ts'), 'export {}')
    await assert.rejects(
      checkExampleBoundaries(root),
      /Remove stale example import exception/,
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

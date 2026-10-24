import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { build } from 'vite'
import { cssAbsent } from '../../scripts/css-provenance.mjs'
import { assertEditingControlModules } from '../../examples/shared/editing-module-audit.mjs'

for (const directory of ['src', 'dist/source']) {
  test(`editing module guard accepts its owned ${directory} families and rejects external or unexpected modules`, () => {
    const base = `/wfe/packages/components/${directory}/vendor/kobalte/`
    const extension = directory === 'src' ? 'tsx' : 'jsx'
    const accepted = [
      `${base}core/src/checkbox/checkbox-root.${extension}`,
      `${base}core/src/select/select-root.${extension}`,
      `${base}core/src/popover/popover-root.${extension}`,
      `${base}core/src/primitives/create-collection/create-collection.ts`,
      `${base}utils/src/events.ts`,
    ]
    assert.doesNotThrow(() => assertEditingControlModules(accepted))
    for (const extra of [
      '/wfe/node_modules/@kobalte/core/dist/index.js',
      '/wfe/node_modules/@tanstack/table-core/index.js',
      `${base}core/src/dialog/dialog-root.${extension}`,
      `${base}core/src/primitives/unexpected/index.ts`,
    ])
      assert.throws(() => assertEditingControlModules([...accepted, extra]))
    assert.throws(
      () => assertEditingControlModules(accepted.slice(1)),
      /checkbox/,
    )
  })
}

test('CSS-free diagnostic builds record absence and reject introduced CSS imports', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'wfe-css-free-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await writeFile(
    join(root, 'index.html'),
    '<script type="module" src="/main.js"></script>',
  )
  await writeFile(join(root, 'main.js'), 'window.fixture = true')
  const compile = () =>
    build({
      configFile: false,
      root,
      logLevel: 'silent',
      plugins: [cssAbsent()],
      build: { write: false, minify: false },
    })
  const result = await compile()
  const manifest = result.output.find(
    (item) => item.fileName === 'css-contract.json',
  )
  assert.deepEqual(JSON.parse(manifest.source), { css: 'none' })
  await writeFile(join(root, 'extra.css'), 'main { display: block }')
  await writeFile(join(root, 'main.js'), 'import "./extra.css"')
  await assert.rejects(compile(), /CSS-free fixture imported CSS/)
})

test('CSS-free diagnostic guard rejects injected CSS assets and CSS modules', () => {
  const plugin = cssAbsent()
  const context = { emitFile: () => {} }
  assert.throws(
    () =>
      plugin.generateBundle.call(
        context,
        {},
        {
          asset: { type: 'asset', fileName: 'injected.css', source: '' },
        },
      ),
    /emitted CSS/,
  )
  assert.throws(
    () =>
      plugin.generateBundle.call(
        context,
        {},
        {
          chunk: {
            type: 'chunk',
            fileName: 'main.js',
            modules: { '/fixture/import.css': {} },
          },
        },
      ),
    /bundled CSS/,
  )
})

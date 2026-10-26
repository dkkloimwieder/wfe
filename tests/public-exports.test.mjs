import assert from 'node:assert/strict'
import { access, readFile, readdir } from 'node:fs/promises'
import { test } from 'node:test'
import { createRoot } from 'solid-js'
import { createTable, nativeAggregations } from '@wfe/components/table'
import * as components from '@wfe/components'

test('JSX packages keep ordered exports and separate module graphs', async () => {
  for (const [name, count] of [
    ['components', 31],
    ['generator', 2],
    ['shell', 1],
  ]) {
    const root = new URL(`../packages/${name}/`, import.meta.url)
    const manifest = JSON.parse(
      await readFile(new URL('package.json', root), 'utf8'),
    )
    const entries = Object.entries(manifest.exports).filter(
      ([key]) => !key.endsWith('.css'),
    )
    assert.equal(entries.length, count)
    for (const [key, entry] of entries) {
      assert.deepEqual(
        Object.keys(entry),
        ['types', 'wfe-source', 'solid', 'node', 'default'],
        `${name}${key}`,
      )
      const path = entry['wfe-source']
        .replace('./src/', '')
        .replace(/\.tsx?$/, '')
      assert.deepEqual(entry, {
        types: `./dist/${path}.d.ts`,
        'wfe-source': entry['wfe-source'],
        solid: `./dist/${path}.jsx`,
        node: `./dist/server/${path}.js`,
        default: `./dist/${path}.js`,
      })
      for (const target of Object.values(entry))
        await access(new URL(target, root))
    }
    if (name === 'components')
      assert.deepEqual(manifest.exports['./styles.css'], {
        default: './dist/styles/styles.css',
      })
    const dist = new URL('dist/', root)
    const files = await readdir(dist, { recursive: true })
    assert.ok(!files.includes('client') && !files.includes('source'))
    for (const file of files.filter((path) => /\.jsx?$/.test(path))) {
      const extension = file.endsWith('.jsx') ? '.jsx' : '.js'
      const url = new URL(file, dist)
      const code = await readFile(url, 'utf8')
      for (const [, dependency] of code.matchAll(
        /\b(?:from\s*|import\s*(?:\(\s*)?)['"](\.[^'"]+)['"]/g,
      )) {
        assert.ok(
          dependency.endsWith(extension),
          `${name}/${file} imports ${dependency}`,
        )
        const target = new URL(dependency, url)
        assert.ok(
          target.href.startsWith(dist.href),
          `Import escapes dist: ${target}`,
        )
        assert.equal(
          target.href.startsWith(new URL('server/', dist).href),
          file.startsWith('server/'),
        )
        await access(target)
      }
    }
  }
})

test('component outputs retain style assets and vendor license text', async () => {
  const root = new URL('../packages/components/', import.meta.url)
  const source = new URL('src/', root)
  const assets = (await readdir(source, { recursive: true })).filter(
    (path) =>
      (path.startsWith('styles/') && /\.css$|LICENSE/.test(path)) ||
      (path.startsWith('vendor/') && /\/LICENSE[^/]*$/.test(path)),
  )
  for (const directory of ['dist/', 'dist/server/']) {
    for (const file of assets) {
      assert.deepEqual(
        await readFile(new URL(directory + file, root)),
        await readFile(new URL(file, source)),
        directory + file,
      )
    }
  }
})

test('all public source, client, server, style, and type targets exist', async () => {
  const manifest = JSON.parse(
    await readFile(
      new URL('../packages/components/package.json', import.meta.url),
      'utf8',
    ),
  )
  for (const entry of Object.values(manifest.exports)) {
    for (const file of typeof entry === 'string'
      ? [entry]
      : Object.values(entry)) {
      await access(new URL('../packages/components/' + file, import.meta.url))
    }
  }
  for (const name of [
    'Icon',
    'Input',
    'NumberInput',
    'FormGrid',
    'FieldGroup',
    'Calendar',
    'DatePicker',
    'DateTimePicker',
    'Checkbox',
    'Collapsible',
    'Select',
    'Combobox',
    'Dialog',
    'Popover',
    'Table',
    'ReadOnlyTable',
    'TableDateFilter',
    'TableColumnFilter',
    'TableWorkspace',
    'TableControlSection',
    'DashboardShell',
    'DashboardGrid',
    'DashboardPanel',
    'StatusTile',
    'TileRow',
  ]) {
    assert.equal(typeof components[name], 'function', name)
  }
})

test('the public table entry reads application records without an adapter', () => {
  createRoot((dispose) => {
    const rows = {
      a: { name: 'Ada', amount: 2 },
      b: { name: 'Grace', amount: 3 },
    }
    const table = createTable({
      source: { ids: () => ['a', 'b'], get: (id) => rows[id] },
      columns: [
        { id: 'name', accessorKey: 'name' },
        {
          id: 'amount',
          accessorKey: 'amount',
          aggregationFn: nativeAggregations.sum,
        },
      ],
    })
    assert.deepEqual(table.getSourceIds(), ['a', 'b'])
    assert.equal(
      table.createRowView('a').getVisibleCells()[0].getValue(),
      'Ada',
    )
    dispose()
  })
})

test('form package exposes its built entry and declarations', async () => {
  const { createForm } = await import('@wfe/form')
  assert.equal(typeof createForm, 'function')
  const manifest = JSON.parse(
    await readFile(
      new URL('../packages/form/package.json', import.meta.url),
      'utf8',
    ),
  )
  for (const file of Object.values(manifest.exports['.'])) {
    await access(new URL('../packages/form/' + file, import.meta.url))
  }
})

test('private generator exposes declarations and a valid package entry', async () => {
  const generator = await import('@wfe/generator')
  for (const name of ['FormView', 'TableView', 'LayoutView', 'GridView'])
    assert.equal(typeof generator[name], 'function')
  const manifest = JSON.parse(
    await readFile(
      new URL('../packages/generator/package.json', import.meta.url),
      'utf8',
    ),
  )
  assert.equal(manifest.private, true)
  for (const file of Object.values(manifest.exports['.']))
    await access(new URL('../packages/generator/' + file, import.meta.url))
})

test('private shell exposes metadata guards and all package delivery targets', async () => {
  const shell = await import('@wfe/shell')
  for (const name of ['defineShell', 'ShellView'])
    assert.equal(typeof shell[name], 'function')
  const manifest = JSON.parse(
    await readFile(
      new URL('../packages/shell/package.json', import.meta.url),
      'utf8',
    ),
  )
  assert.equal(manifest.private, true)
  for (const file of Object.values(manifest.exports['.']))
    await access(new URL('../packages/shell/' + file, import.meta.url))
})

import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { build } from 'vite'
import solid from '@solidjs/vite-plugin'
import { parseIcon } from './icons.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const temporary = await mkdtemp(join(root, '.icon-consumer-'))
try {
  const entry = join(temporary, 'consumer.tsx')
  await writeFile(
    entry,
    `import { Icon } from '@wfe/components';
import { iconSearch } from '@wfe/components/icons';
export function Example() { return <Icon glyph={iconSearch} /> }
`,
  )
  const originals = JSON.parse(
    await readFile(
      new URL(
        '../packages/components/src/vendor/icons/upstream.json',
        import.meta.url,
      ),
      'utf8',
    ),
  )
  const marker = (name) =>
    parseIcon(name, originals[name])
      .nodes.filter(([tag]) => tag === 'path')
      .map(([, attrs]) => attrs.d)
      .sort((a, b) => b.length - a.length)[0]
  for (const distribution of [false, true]) {
    const result = await build({
      configFile: false,
      root,
      plugins: [solid()],
      logLevel: 'warn',
      resolve: {
        conditions: [
          ...(distribution ? [] : ['wfe-source']),
          'module',
          'browser',
          'production',
        ],
      },
      build: { write: false, minify: true, lib: { entry, formats: ['es'] } },
    })
    const code = (Array.isArray(result) ? result : [result])
      .flatMap((bundle) => bundle.output)
      .filter((file) => file.type === 'chunk')
      .map((file) => file.code)
      .join('\n')
    assert.ok(
      code.includes(marker('search')),
      'Used search artwork must remain',
    )
    for (const unused of ['worm', 'telescope'])
      assert.ok(
        !code.includes(marker(unused)),
        `Unused ${unused} artwork must be removed`,
      )
    console.log(
      `Icons: ${distribution ? 'built-package' : 'source'} consumer retains search and excludes unused artwork (${code.length} bytes including renderer)`,
    )
  }
  const notice = await readFile(
    new URL('../packages/components/src/vendor/icons/LICENSE', import.meta.url),
    'utf8',
  )
  for (const mode of ['', 'server/']) {
    assert.equal(
      await readFile(
        new URL(
          `../packages/components/dist/${mode}vendor/icons/LICENSE`,
          import.meta.url,
        ),
        'utf8',
      ),
      notice,
    )
  }
  const { Icon } = await import('@wfe/components')
  const { iconSearch } = await import('@wfe/components/icons')
  const { createComponent, renderToString } = await import('@solidjs/web')
  const html = await renderToString(() =>
    createComponent(Icon, { glyph: iconSearch }),
  )
  assert.ok(html.includes(marker('search')))
  assert.ok(html.includes('<circle'))
  assert.ok(html.includes('aria-hidden="true"'))
  assert.ok(!html.includes('tabindex'))
  const legacy = await renderToString(() =>
    createComponent(Icon, { name: 'chevron-down' }),
  )
  assert.ok(legacy.includes('ui-direction-triangle'))
  console.log(
    'Icons: server rendering preserves structured geometry and legacy triangles',
  )
} finally {
  await rm(temporary, { recursive: true, force: true })
}

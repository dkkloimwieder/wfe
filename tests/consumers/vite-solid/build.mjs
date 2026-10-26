import assert from 'node:assert/strict'
import { mkdtemp, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import { packages } from '../packages.mjs'

const directory = fileURLToPath(new URL('.', import.meta.url))
const outDir = await mkdtemp(resolve(tmpdir(), 'wfe-solid-consumer-'))
const resolved = new Map()
const required = [
  '@wfe/components',
  '@wfe/components/table',
  '@wfe/components/display',
  '@wfe/components/styles.css',
  '@wfe/generator',
  '@wfe/shell',
]
let moduleCount = 0
try {
  const result = await build({
    configFile: resolve(directory, 'vite.config.ts'),
    build: { outDir, emptyOutDir: true },
    plugins: [
      {
        name: 'assert-built-solid-consumer',
        enforce: 'pre',
        configResolved(config) {
          assert.ok(
            config.resolve.conditions.includes('solid'),
            'The Solid plugin must enable the solid condition',
          )
          assert.ok(
            !config.resolve.conditions.includes('wfe-source'),
            'Consumers must not enable wfe-source',
          )
        },
        async resolveId(source, importer, options) {
          if (!source.startsWith('@wfe/')) return null
          const pkg = packages.find(
            ({ manifest }) =>
              source === manifest.name ||
              source.startsWith(`${manifest.name}/`),
          )
          assert.ok(pkg, `Unknown package import: ${source}`)
          const subpath =
            source === pkg.manifest.name
              ? '.'
              : `.${source.slice(pkg.manifest.name.length)}`
          const target = pkg.manifest.exports[subpath]
          assert.ok(target, `Missing public subpath: ${source}`)
          const css = subpath.endsWith('.css')
          const jsxPackage = ['components', 'generator', 'shell'].includes(
            pkg.name,
          )
          const expected = css
            ? target.default
            : jsxPackage
              ? target.solid
              : (target.default ?? target.import)
          assert.ok(
            expected?.startsWith('./dist/'),
            `Missing built target: ${source}`,
          )
          const actual = await this.resolve(source, importer, {
            ...options,
            skipSelf: true,
          })
          assert.ok(
            actual && !actual.external,
            `Unresolved consumer import: ${source}`,
          )
          assert.equal(
            actual.id,
            resolve(pkg.directory, expected),
            `${source} must resolve to its ${css ? 'CSS asset' : jsxPackage ? 'solid' : 'JavaScript'} target`,
          )
          resolved.set(source, actual.id)
          return actual
        },
        generateBundle() {
          // Include transitive and tree-shaken modules, not only output chunks.
          for (const id of this.getModuleIds()) {
            for (const pkg of packages) {
              if (!id.startsWith(pkg.directory + sep)) continue
              const path = relative(pkg.directory, id).replaceAll('\\', '/')
              assert.ok(
                path.startsWith('dist/'),
                `Package source entered the build: ${id}`,
              )
              assert.ok(
                !/^dist\/(client|server)\//.test(path),
                `Precompiled JSX entered the build: ${id}`,
              )
              moduleCount++
            }
          }
          for (const source of required)
            assert.ok(
              resolved.has(source),
              `Consumer did not resolve ${source}`,
            )
          assert.ok(moduleCount > 0, 'No built package modules were inspected')
        },
      },
    ],
  })
  const assets = (Array.isArray(result) ? result : [result])
    .flatMap(({ output }) => output)
    .filter((item) => item.type === 'asset' && item.fileName.endsWith('.css'))
  assert.ok(assets.length, 'The consumer must emit a CSS asset')
  for (const asset of assets)
    assert.ok(
      (await stat(resolve(outDir, asset.fileName))).size > 0,
      'The CSS asset must not be empty',
    )
  console.log(
    `Solid targets matched for ${resolved.size} public imports; inspected ${moduleCount} built package modules; emitted ${assets.length} CSS asset(s).`,
  )
} finally {
  await rm(outDir, { recursive: true, force: true })
}

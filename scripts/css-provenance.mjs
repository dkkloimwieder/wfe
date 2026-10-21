import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve, relative } from 'node:path'

export const hashCss = (value) =>
  createHash('sha256').update(value).digest('hex')
export function cssInputs(root, directory) {
  const files = new Map()
  function visit(name) {
    const path = resolve(root, directory, name)
    if (files.has(path)) return
    const text = readFileSync(path, 'utf8')
    files.set(path, hashCss(text))
    for (const match of text.matchAll(/@import\s+['"](\.[^'"]+)['"]/g))
      visit(relative(resolve(root, directory), resolve(path, '..', match[1])))
  }
  visit('styles.css')
  return files
}
export function cssProvenance(root, distribution = false) {
  const directory = `packages/components/${distribution ? 'dist/source' : 'src'}/styles`
  const entry = resolve(root, directory, 'styles.css')
  let serverBuild = false
  const compilations = new Map(),
    stylesheets = new Map()
  const libraryCss = (file) =>
    /\/packages\/components\/(?:src|dist)\/.*\.css$/.test(file)
  const postcss = {
    postcssPlugin: 'shared-css-inputs',
    OnceExit(ast, { result }) {
      const loaded = new Map()
      let ownsStyles = false
      const remember = (node) => {
        const input = node.source?.input
        if (input?.file && libraryCss(input.file)) {
          ownsStyles = true
          loaded.set(input.file, hashCss(input.css))
        }
      }
      remember(ast)
      ast.walk(remember)
      for (const message of result.messages)
        if (
          message.type === 'dependency' &&
          message.file &&
          libraryCss(message.file)
        ) {
          ownsStyles = true
          if (!loaded.has(message.file))
            loaded.set(message.file, hashCss(readFileSync(message.file)))
        }
      if (ownsStyles && ast.source?.input.file) {
        compilations.set(ast.source.input.file, loaded)
      }
    },
  }
  function manifest(assets = []) {
    const loaded = new Map(
      [...compilations.values()].flatMap((files) => [...files]),
    )
    const inputs = cssInputs(root, directory)
    assert.ok(loaded.size, 'The build must load shared component CSS.')
    for (const path of loaded.keys())
      assert.ok(inputs.has(path), `Wrong shared CSS input: ${path}`)
    for (const [path, hash] of inputs) {
      assert.ok(loaded.has(path), `Missing shared CSS dependency: ${path}`)
      assert.equal(
        loaded.get(path),
        hash,
        `Stale compiled CSS: ${path}. Reload the fixture.`,
      )
      if (distribution)
        assert.equal(
          hash,
          hashCss(
            readFileSync(
              resolve(
                root,
                'packages/components/src/styles',
                relative(resolve(root, directory), path),
              ),
            ),
          ),
          `Stale built CSS: ${path}. Build components before distribution qualification.`,
        )
    }
    return {
      mode: distribution ? 'distribution' : 'source',
      entry: relative(root, entry),
      inputs: [...inputs].map(([path, sha256]) => ({
        file: relative(root, path),
        sha256,
      })),
      assets,
      stylesheets: [...stylesheets].map(([file, sha256]) => ({ file, sha256 })),
    }
  }
  return {
    name: 'shared-css-provenance',
    config() {
      return {
        resolve: { alias: { '@wfe/components/styles.css': entry } },
        css: { postcss: { plugins: [postcss] } },
      }
    },
    transform(code, id, options) {
      const [file, query = ''] = id.split('?')
      const parameters = new URLSearchParams(query)
      if (options?.ssr || parameters.has('raw') || parameters.has('url')) return
      if (compilations.has(file))
        stylesheets.set(relative(root, file), hashCss(code.trim()))
    },
    configResolved(config) {
      serverBuild = Boolean(config.build.ssr)
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split('?')[0] !== '/css-provenance.json') return next()
        try {
          response.setHeader('Content-Type', 'application/json')
          response.setHeader('Cache-Control', 'no-store')
          response.end(JSON.stringify({ ...manifest(), live: true }))
        } catch (error) {
          response.statusCode = 500
          response.end(String(error))
        }
      })
    },
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        if (serverBuild) return
        const assets = Object.values(bundle)
          .filter(
            (item) => item.type === 'asset' && item.fileName.endsWith('.css'),
          )
          .map((item) => ({
            file: item.fileName,
            sha256: hashCss(item.source),
          }))
        assert.ok(assets.length, 'The fixture must emit CSS assets.')
        this.emitFile({
          type: 'asset',
          fileName: 'css-provenance.json',
          source: JSON.stringify(manifest(assets), null, 2),
        })
      },
    },
  }
}

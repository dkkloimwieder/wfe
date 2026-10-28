import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { build, createServer } from 'vite'
import { cssProvenance, hashCss } from '../../scripts/css-provenance.mjs'

async function fixture(work) {
  const root = await mkdtemp(join(tmpdir(), 'wfe-css-provenance-'))
  try {
    for (const directory of ['src', 'dist']) {
      const path = join(root, 'packages/components', directory, 'styles')
      await mkdir(path, { recursive: true })
      await writeFile(join(path, 'styles.css'), "@import './fields.css';\n")
      await writeFile(
        join(path, 'fields.css'),
        '.control {border: 1px solid black;}\n',
      )
    }
    await writeFile(
      join(root, 'index.html'),
      '<!doctype html><link rel="stylesheet" href="/entry.css"><div class="control">Fixture</div>',
    )
    const compile = async ({
      distribution = false,
      wrong = false,
      afterCss,
      instance,
    } = {}) => {
      const provenance = instance ?? cssProvenance(root, distribution)
      return build({
        configFile: false,
        root,
        logLevel: 'silent',
        plugins: [provenance],
        resolve: {
          alias: {
            '/entry.css': resolve(
              root,
              `packages/components/${distribution || wrong ? 'dist' : 'src'}/styles/styles.css`,
            ),
          },
        },
        css: {
          postcss: {
            plugins: [
              ...(afterCss
                ? [
                    {
                      postcssPlugin: 'change-after-compile',
                      OnceExit: afterCss,
                    },
                  ]
                : []),
            ],
          },
        },
        build: { write: false, minify: false },
      })
    }
    await work({ root, compile })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}
test('CSS provenance records actual imported inputs and emitted asset bytes', () =>
  fixture(async ({ root, compile }) => {
    for (const distribution of [false, true]) {
      const result = await compile({ distribution })
      const manifest = JSON.parse(
        result.output.find((asset) => asset.fileName === 'css-provenance.json')
          .source,
      )
      assert.equal(manifest.mode, distribution ? 'distribution' : 'source')
      assert.equal(manifest.inputs.length, 2)
      for (const input of manifest.inputs)
        assert.equal(
          input.sha256,
          hashCss(await readFile(join(root, input.file))),
        )
      for (const asset of manifest.assets)
        assert.equal(
          asset.sha256,
          hashCss(
            result.output.find((value) => value.fileName === asset.file).source,
          ),
        )
    }
  }))
test('source CSS qualification rejects CSS resolved from distribution', () =>
  fixture(async ({ compile }) => {
    await assert.rejects(compile({ wrong: true }), /Wrong shared CSS input/)
  }))
test('distribution CSS qualification rejects stale copied styles', () =>
  fixture(async ({ root, compile }) => {
    await writeFile(
      join(root, 'packages/components/dist/styles/fields.css'),
      '.control {border:2px solid black;}',
    )
    await assert.rejects(compile({ distribution: true }), /Stale built CSS/)
  }))
test('CSS provenance rejects source changes after compilation', () =>
  fixture(async ({ root, compile }) => {
    await assert.rejects(
      compile({
        afterCss: () =>
          writeFileSync(
            join(root, 'packages/components/src/styles/fields.css'),
            '.control {border:3px solid black;}',
          ),
      }),
      /Stale compiled CSS/,
    )
  }))

test('CSS provenance refreshes import-only entries after recompilation', () =>
  fixture(async ({ root, compile }) => {
    await writeFile(
      join(root, 'page.css'),
      "@import '@wfe/components/styles.css';\n",
    )
    await writeFile(
      join(root, 'index.html'),
      '<!doctype html><link rel="stylesheet" href="/page.css"><div class="control">Fixture</div>',
    )
    const instance = cssProvenance(root)
    await compile({ instance })
    await writeFile(
      join(root, 'packages/components/src/styles/styles.css'),
      "\n@import './fields.css';\n",
    )
    await compile({ instance })
  }))

test('CSS provenance discards imports removed during recompilation', () =>
  fixture(async ({ root, compile }) => {
    await writeFile(
      join(root, 'page.css'),
      "@import '@wfe/components/styles.css';\n",
    )
    await writeFile(
      join(root, 'index.html'),
      '<!doctype html><link rel="stylesheet" href="/page.css">',
    )
    const entry = join(root, 'packages/components/src/styles/styles.css')
    await writeFile(
      join(root, 'packages/components/src/styles/extra.css'),
      '.extra {color: black;}',
    )
    await writeFile(entry, "@import './fields.css';\n@import './extra.css';\n")
    const instance = cssProvenance(root)
    await compile({ instance })
    await writeFile(entry, "@import './fields.css';\n")
    await compile({ instance })
  }))

test('live CSS provenance hashes resolved asset URLs after PostCSS', () =>
  fixture(async ({ root }) => {
    const styles = join(root, 'packages/components/src/styles')
    await writeFile(join(styles, 'font.woff2'), 'fixture font bytes')
    await writeFile(
      join(styles, 'fields.css'),
      '@font-face { font-family: fixture; src: url("./font.woff2"); }',
    )
    const server = await createServer({
      configFile: false,
      root,
      logLevel: 'silent',
      plugins: [cssProvenance(root)],
      server: { host: '127.0.0.1', port: 0 },
    })
    try {
      await server.listen()
      const entry = '/packages/components/src/styles/styles.css'
      const transformed = await server.transformRequest(entry)
      const literal = transformed.code.match(/const __vite__css = (".*")/)
      assert.ok(literal, 'Vite attaches a stylesheet to the page')
      const css = JSON.parse(literal[1])
      assert.ok(css.includes('/packages/components/src/styles/font.woff2'))
      for (const query of ['', '?raw', '?url', '?direct']) {
        await server.transformRequest(`${entry}${query}`)
        const response = await fetch(
          `http://127.0.0.1:${server.httpServer.address().port}/css-provenance.json`,
        )
        assert.equal(response.status, 200)
        const manifest = await response.json()
        const sheet = manifest.stylesheets.find(
          (value) => value.file === entry.slice(1),
        )
        assert.equal(
          sheet.sha256,
          hashCss(css.trim()),
          `Preserve CSS hash after ${query || 'normal'} import`,
        )
        assert.equal(manifest.inputs.length, 2)
      }
    } finally {
      await server.close()
    }
  }))

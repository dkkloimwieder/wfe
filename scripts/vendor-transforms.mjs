import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runTsc } from './lib/tsc.mjs'

const capture = fileURLToPath(
  new URL('../packages/components/src/vendor/dnd-kit/', import.meta.url),
).replaceAll('\\', '/')

const isSource = (file) => file.endsWith('.ts') && !file.endsWith('.d.ts')

function emitSources(root, files, scratch) {
  const outDir = join(scratch, 'dist')
  const config = join(scratch, 'tsconfig.json')
  writeFileSync(
    config,
    JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        isolatedModules: true,
        noCheck: true,
        noResolve: true,
        types: [],
        verbatimModuleSyntax: true,
        sourceMap: true,
        inlineSources: true,
        rootDir: root,
        outDir,
      },
      files: files.map((file) => join(root, file)),
    }),
  )
  const result = runTsc(['--project', config])
  if (result.status !== 0)
    throw new Error(
      `Vendor decorator emit failed:\n${result.stdout}${result.stderr}`,
    )
  return new Map(
    files.map((file) => {
      const output = join(outDir, file.replace(/\.ts$/, '.js'))
      const code = readFileSync(output, 'utf8')
      const map = JSON.parse(readFileSync(output + '.map', 'utf8'))
      return [file, { code, map }]
    }),
  )
}

function withScratch(work) {
  const scratch = mkdtempSync(join(tmpdir(), 'wfe-vendor-emit-'))
  try {
    return work(scratch)
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
}

// Oxc 0.159 and Rolldown 1.2 support legacy decorator lowering. The captured
// engine uses standard decorators, so use the tsc CLI for the ES2022 emit.
export function vendorTransforms() {
  let captured
  return {
    name: 'wfe-vendor-decorators',
    enforce: /** @type {const} */ ('pre'),
    transform(code, id) {
      const file = id.split('?')[0].replaceAll('\\', '/')
      if (!file.startsWith(capture) || !isSource(file)) return null
      captured ??= withScratch((scratch) =>
        emitSources(
          capture,
          readdirSync(capture, { recursive: true }).filter(isSource),
          scratch,
        ),
      )
      const path = relative(capture, file)
      let output = captured.get(path)
      if (output?.map.sourcesContent[0] !== code) {
        // Plugins can receive edited or virtual input. Compile the hook's text.
        output = withScratch((scratch) => {
          const name = basename(file)
          const input = join(scratch, name)
          writeFileSync(input, code)
          return emitSources(dirname(input), [name], scratch).get(name)
        })
        captured.set(path, output)
      }
      return { code: output.code, map: { ...output.map, sources: [file] } }
    },
  }
}

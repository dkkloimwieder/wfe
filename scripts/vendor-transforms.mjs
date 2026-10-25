import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const capture = fileURLToPath(
  new URL('../packages/components/src/vendor/dnd-kit/', import.meta.url),
).replaceAll('\\', '/')

// Only the captured engine uses standard decorators. Keep Solid JSX and all
// other source files in their existing compiler pipelines.
export function vendorTransforms() {
  return {
    name: 'wfe-vendor-decorators',
    enforce: /** @type {const} */ ('pre'),
    transform(code, id) {
      const file = id.split('?')[0].replaceAll('\\', '/')
      if (
        !file.startsWith(capture) ||
        !file.endsWith('.ts') ||
        file.endsWith('.d.ts')
      )
        return null
      const result = ts.transpileModule(code, {
        fileName: file,
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
          experimentalDecorators: false,
          verbatimModuleSyntax: true,
          sourceMap: true,
          inlineSources: true,
        },
      })
      const map = JSON.parse(result.sourceMapText)
      map.sources = [file]
      return { code: result.outputText, map }
    },
  }
}

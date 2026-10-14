import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const source = fileURLToPath(
  new URL('../packages/components/src/', import.meta.url),
)
const output = fileURLToPath(
  new URL('../packages/components/dist/source/', import.meta.url),
)
async function visit(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await visit(path)))
    else if (/\.tsx?$/.test(path)) files.push(path)
  }
  return files
}
const files = await visit(source)
const outputs = new Map(
  files.map((file) => [
    file,
    relative(source, file).replace(
      /\.tsx?$/,
      file.endsWith('.tsx') ? '.jsx' : '.js',
    ),
  ]),
)
for (const file of files) {
  const result = ts.transpileModule(await readFile(file, 'utf8'), {
    fileName: file,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.Preserve,
    },
  })
  const code = result.outputText.replace(
    /(from\s+|import\s*)["'](\.[^"']+)["']/g,
    (match, prefix, specifier) => {
      const base = resolve(dirname(file), specifier)
      const target = [
        base,
        base + '.ts',
        base + '.tsx',
        base + '/index.ts',
        base + '/index.tsx',
      ].find((path) => outputs.has(path))
      if (!target) return match
      const path = relative(dirname(outputs.get(file)), outputs.get(target))
      return `${prefix}'${path.startsWith('.') ? path : './' + path}'`
    },
  )
  const destination = resolve(output, outputs.get(file))
  await mkdir(dirname(destination), { recursive: true })
  await writeFile(destination, code)
}

await cp(resolve(source, 'styles'), resolve(output, 'styles'), {
  recursive: true,
})

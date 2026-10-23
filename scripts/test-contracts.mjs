import {
  documents,
  contracts,
  typeScriptFences,
} from './coverage-inventory.mjs'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const files = new Map()
for (const document of documents.filter(({ status }) => status === 'covered')) {
  const fences = typeScriptFences(
    readFileSync(resolve(packageRoot, document.path), 'utf8'),
  )
  for (const [index, fence] of fences.entries()) {
    files.set(
      resolve(
        packageRoot,
        `${document.path}.example-${index}.${fence.language}`,
      ),
      fence.code,
    )
  }
}
const configPath = resolve(packageRoot, 'packages/components/tsconfig.json')
const config = ts.readConfigFile(configPath, ts.sys.readFile)
if (config.error)
  throw new Error(
    ts.flattenDiagnosticMessageText(config.error.messageText, '\n'),
  )
const parsed = ts.parseJsonConfigFileContent(
  config.config,
  ts.sys,
  dirname(configPath),
)
parsed.options.types = ['vite/client']
if (!files.size) throw new Error('No UI contract examples found')
const host = ts.createCompilerHost(parsed.options)
const readFile = host.readFile.bind(host)
const fileExists = host.fileExists.bind(host)
host.readFile = (path) => files.get(path) ?? readFile(path)
host.fileExists = (path) => files.has(path) || fileExists(path)
const program = ts.createProgram(
  [
    ...files.keys(),
    ...contracts
      .filter(({ gate }) => gate === 'contracts')
      .map(({ path }) => resolve(packageRoot, path)),
  ],
  parsed.options,
  host,
)
const diagnostics = [...parsed.errors, ...ts.getPreEmitDiagnostics(program)]
if (diagnostics.length) {
  console.error(
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: (path) => path,
      getCurrentDirectory: () => packageRoot,
      getNewLine: () => '\n',
    }),
  )
  process.exitCode = 1
} else {
  console.log(
    `Typechecked ${files.size} UI contract examples and generator contracts`,
  )
}

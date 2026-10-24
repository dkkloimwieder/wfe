import { readdir, readFile } from 'node:fs/promises'
import { dirname, resolve, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

// Exact suite-owned harness and integration edges, never directory exemptions.
export const exampleImportExceptions = [
  [
    'components/main.tsx',
    '../table-editing/fixture',
    'Mount the same editing qualification harness for popup interoperability.',
  ],
  [
    'components/run.mjs',
    '../table-editing/field-configuration-cases.mjs',
    'Reuse the editing qualification cases against the popup fixture.',
  ],
  [
    'components/run.mjs',
    '../table-editing/editing-callback-cases.mjs',
    'Reuse application callback assertions against the popup fixture.',
  ],
  [
    'components/run.mjs',
    '../table-editing/application-record-cases.mjs',
    'Reuse application record assertions against the popup fixture.',
  ],
  [
    'editing-overhead/main.tsx',
    '../table-editing/createEditing',
    'Measure the actual editing implementation rather than a synthetic copy.',
  ],
  [
    'editing-overhead/main.tsx',
    '../table-editing/model',
    'Measure the actual editing model rather than a synthetic copy.',
  ],
  [
    'editing-overhead/main.tsx',
    '../table-editing/Table',
    'Compare the real editable and read-only presentations.',
  ],
  [
    'editing-overhead/main.tsx',
    '../table-editing/validation',
    'Keep the measured editing validation contract.',
  ],
  [
    'wamn-generator/run.mjs',
    '../generator/run.mjs',
    'Explicit runner root/applications override for the prepared integration fixture.',
  ],
  [
    'wamn-generator/application.ts',
    '../wamn/.input/runtime',
    'Use the prepared integration snapshot without a second generated copy.',
  ],
  [
    'wamn-generator/application.ts',
    '../wamn/.input/widget',
    'Use the prepared integration record types without a second generated copy.',
  ],
  [
    'wamn-generator/application.ts',
    '../wamn/transport',
    'Use the owned integration transport adapter.',
  ],
  [
    'wamn-generator/metadata.ts',
    '../wamn/.input/definition.json',
    'Use the prepared schema snapshot as integration input.',
  ],
  [
    'wamn-generator/metadata.ts',
    '../wamn/.input/components/labels',
    'Use the prepared integration labels.',
  ],
  [
    'wamn-generator/App.tsx',
    '../wamn/.input/widget',
    'Use the prepared integration record types.',
  ],
].map(([file, specifier, reason]) => ({
  file: `examples/${file}`,
  specifier,
  reason,
}))

const exceptionKey = (file, specifier) => `${file}\0${specifier}`
const exceptions = new Map(
  exampleImportExceptions.map((item) => [
    exceptionKey(item.file, item.specifier),
    item,
  ]),
)

export function isPrivateUIImport(specifier) {
  return /(?:@wfe\/(?:components|form|generator|shell)\/(?:src|dist|internal|vendor)(?:\/|$)|packages\/(?:components|form|generator|shell)\/(?:src|dist)(?:\/|$)|@kobalte\/)/.test(
    specifier,
  )
}

/** Inspect module edges, not source text that merely mentions an import. */
export function inspectExampleImports(file, text) {
  const imports = []
  if (file.endsWith('.css')) {
    for (const match of text
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .matchAll(/@import\s+(?:url\(\s*)?(?:['"]([^'"]+)['"]|([^\s;)]+))/g))
      imports.push(match[1] ?? match[2])
  } else {
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
    function visit(node) {
      const specifier =
        ts.isImportDeclaration(node) || ts.isExportDeclaration(node)
          ? node.moduleSpecifier
          : ts.isCallExpression(node) &&
              node.expression.kind === ts.SyntaxKind.ImportKeyword
            ? node.arguments[0]
            : ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)
              ? node.argument.literal
              : undefined
      if (specifier && ts.isStringLiteralLike(specifier))
        imports.push(specifier.text)
      ts.forEachChild(node, visit)
    }
    visit(source)
  }
  const errors = [],
    usedExceptions = []
  const owner = file.split('/')[1]
  for (const specifier of imports) {
    if (isPrivateUIImport(specifier))
      errors.push(
        `${file}: Import UI packages through public exports: ${specifier}`,
      )
    if (!specifier.startsWith('.')) continue
    const target = relative(
      resolve('examples'),
      resolve(dirname(file), specifier),
    ).split(sep)
    if (
      target[0] === '..' ||
      target.length < 2 ||
      target[0] === owner ||
      target[0] === 'shared'
    )
      continue
    const key = exceptionKey(file, specifier)
    if (exceptions.has(key)) usedExceptions.push(key)
    else
      errors.push(
        `${file}: Move shared demonstration content to examples/shared instead of importing sibling example internals: ${specifier}`,
      )
  }
  return { errors, usedExceptions }
}

export async function checkExampleBoundaries(root) {
  const errors = [],
    used = new Set()
  let count = 0
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
      const path = resolve(directory, entry.name)
      if (entry.isDirectory()) await visit(path)
      else if (/\.(?:[cm]?[jt]sx?|css)$/.test(entry.name)) {
        const file = relative(root, path).split(sep).join('/')
        const result = inspectExampleImports(file, await readFile(path, 'utf8'))
        errors.push(...result.errors)
        for (const key of result.usedExceptions) used.add(key)
        count++
      }
    }
  }
  await visit(resolve(root, 'examples'))
  for (const [key, item] of exceptions)
    if (!used.has(key))
      errors.push(
        `${item.file}: Remove stale example import exception: ${item.specifier}`,
      )
  if (errors.length) throw new Error(errors.join('\n'))
  return count
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  console.log(
    `Checked example boundaries for ${await checkExampleBoundaries(fileURLToPath(new URL('../', import.meta.url)))} files`,
  )

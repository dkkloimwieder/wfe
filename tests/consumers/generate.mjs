// After a package build, run with --write to refresh the plain TypeScript files.
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import ts from 'typescript'
import { format, resolveConfig } from 'prettier'
import { packages, root } from './packages.mjs'

const write = process.argv.includes('--write')
const entries = packages.flatMap(({ name, directory, manifest }) =>
  Object.entries(manifest.exports)
    .filter(([subpath]) => !subpath.endsWith('.css'))
    .map(([subpath, target]) => {
      assert.ok(
        target.types?.startsWith('./dist/'),
        `${name}${subpath}: built types required`,
      )
      return {
        name,
        specifier: manifest.name + (subpath === '.' ? '' : subpath.slice(1)),
        declaration: resolve(directory, target.types),
        file: `${subpath === '.' ? 'index' : subpath.slice(2)}.ts`,
      }
    }),
)
const program = ts.createProgram(
  entries.map(({ declaration }) => declaration),
  {
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    strict: true,
    skipLibCheck: true,
    types: [],
  },
)
const checker = program.getTypeChecker()
const row = '{ id: string; value: string }'
const generatorType = (name) => `import('@wfe/generator').${name}`
// Concrete arguments keep conditional and indexed types meaningful. Unconstrained
// parameters use unknown. New constraints require an explicit consumer example.
const argumentsByName = {
  ConfiguredTableColumnFilterProps:
    "import('@wfe/components/table').TableColumnFilterConfig",
  TableVirtualizerOptions: 'string',
  VirtualWindow: 'string',
  FormBindings: row,
  FormContract: row,
  FormShape: row,
  ChartAxisDescription: row,
  ChartViewBindings: row,
  CustomFieldProps: `${row}, 'value'`,
  DeleteViewBindings: 'string',
  DetailDescription: row,
  DetailFieldDescription: row,
  DetailViewBindings: `${row}, ${generatorType('DetailDescription')}<${row}>`,
  FormDescription: row,
  FormFieldDescription: row,
  FormViewBindings: `${row}, ${generatorType('FormDescription')}<${row}>`,
  GridColumnId: generatorType('GridDescription'),
  GridRowId: generatorType('GridDescription'),
  LayoutViewBindings: generatorType('LayoutDescription'),
  RepeatedFieldBinding: `${row}, unknown`,
  RepeatedFieldDescription: row,
  ScalarFieldDescription: row,
  TableViewBindings: `${row}, unknown, ${generatorType('TableDescription')}`,
  ShellAudienceId: "import('@wfe/shell').ShellDescription",
  ShellRouteId: "import('@wfe/shell').ShellDescription",
  ShellViewId: "import('@wfe/shell').ShellDescription",
  Change: "import('@wfe/sync').Row",
  Feed: "import('@wfe/sync').Row, string",
  KeyedCollection: "import('@wfe/sync').Row",
  SyncCollection: "import('@wfe/sync').Row",
}
const prettier = await resolveConfig(resolve(root, 'package.json'))
const counts = new Map()
for (const entry of entries) {
  const source = program.getSourceFile(entry.declaration)
  assert.ok(source, `Build packages first: missing ${entry.declaration}`)
  const module = checker.getSymbolAtLocation(source)
  assert.ok(module, `No declaration module: ${entry.declaration}`)
  const exports = checker
    .getExportsOfModule(module)
    .filter((symbol) => symbol.name !== 'default')
    .sort((a, b) => a.name.localeCompare(b.name, 'en'))
  assert.ok(exports.length, `No named exports: ${entry.specifier}`)
  const fields = exports.map((exported) => {
    const symbol =
      exported.flags & ts.SymbolFlags.Alias
        ? checker.getAliasedSymbol(exported)
        : exported
    let type = exported.name
    if (symbol.flags & ts.SymbolFlags.Value) {
      type = `typeof ${type}`
    } else {
      const declaration = symbol.declarations?.find(
        (node) => node.typeParameters?.length,
      )
      const required =
        declaration?.typeParameters?.filter(
          (parameter) => !parameter.default,
        ) ?? []
      if (required.length) {
        const args = argumentsByName[exported.name]
        assert.ok(
          args || required.every((parameter) => !parameter.constraint),
          `Add concrete type arguments for ${entry.specifier}: ${exported.name}`,
        )
        type += `<${args ?? required.map(() => 'unknown').join(', ')}>`
      }
    }
    return `  ${exported.name}: ${type}`
  })
  const content = await format(
    `// Generated from built declarations by tests/consumers/generate.mjs.
// Resolve only public package exports through the workspace node_modules links.
import type { ${exports.map(({ name }) => name).join(', ')} } from '${entry.specifier}'
import type { AllTyped, Assert } from '../assertions.js'

export type ExportedTypes = Assert<AllTyped<{
${fields.join('\n')}
}>>
`,
    { ...prettier, parser: 'typescript' },
  )
  const directory = resolve(root, 'tests/consumers', entry.name)
  const destination = resolve(directory, entry.file)
  if (write) {
    mkdirSync(directory, { recursive: true })
    writeFileSync(destination, content)
  } else {
    assert.equal(
      readFileSync(destination, 'utf8'),
      content,
      `Stale consumer: ${destination}. Build packages, then run node tests/consumers/generate.mjs --write.`,
    )
  }
  counts.set(entry.name, (counts.get(entry.name) ?? 0) + exports.length)
}
for (const { name } of packages) {
  const expected = entries
    .filter((entry) => entry.name === name)
    .map(({ file }) => file)
  if (name === 'sync') expected.push('contracts.ts')
  const actual = readdirSync(resolve(root, 'tests/consumers', name)).filter(
    (file) => file.endsWith('.ts'),
  )
  assert.deepEqual(
    actual.sort(),
    expected.sort(),
    `${name}: stale or missing consumer files`,
  )
  console.log(
    `${name}: ${counts.get(name)} named exports across ${expected.length - (name === 'sync' ? 1 : 0)} JS entries`,
  )
}

// After a package build, run with --write to refresh the plain TypeScript files.
import assert from 'node:assert/strict'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { dirname, resolve } from 'node:path'
import { parseSync } from 'oxc-parser'
import { runTsc } from '../../scripts/lib/tsc.mjs'
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
// The build emits ESM declaration modules. Oxc supplies their named exports
// and local re-export edges. tsc still resolves the public imports and decides
// whether each exported symbol can be used as a value.
const modules = new Map()
function declarationModule(path) {
  if (modules.has(path)) return modules.get(path)
  assert.ok(existsSync(path), `Build packages first: missing ${path}`)
  const { program, module, errors } = parseSync(
    path,
    readFileSync(path, 'utf8'),
  )
  assert.deepEqual(
    errors.map(({ message }) => message),
    [],
    path,
  )
  assert.ok(module.hasModuleSyntax, `No declaration module: ${path}`)
  const declarations = new Map()
  for (const statement of program.body) {
    const declaration = statement.declaration ?? statement
    if (declaration.id && declaration.typeParameters?.params.length)
      declarations.set(declaration.id.name, declaration.typeParameters.params)
  }
  const named = new Map()
  const stars = []
  for (const { entries } of module.staticExports)
    for (const item of entries) {
      if (item.importName.kind === 'AllButDefault')
        stars.push(item.moduleRequest.value)
      else if (item.exportName.kind !== 'None')
        named.set(item.exportName.name ?? 'default', item)
    }
  const result = { named, stars, declarations }
  modules.set(path, result)
  return result
}

function declarationPath(path, specifier) {
  assert.ok(
    specifier.startsWith('.'),
    `${path}: expected a local declaration edge: ${specifier}`,
  )
  const target = resolve(dirname(path), specifier)
  const found = [
    target.replace(/\.([cm]?)js$/, '.d.$1ts'),
    target + '.d.ts',
    resolve(target, 'index.d.ts'),
  ].find(existsSync)
  assert.ok(found, `${path}: missing built declaration for ${specifier}`)
  return found
}

function namedExports(path, active = new Set()) {
  if (active.has(path)) return new Map()
  active.add(path)
  const { named, stars } = declarationModule(path)
  const result = new Map(
    [...named].map(([name, item]) => [name, { path, item }]),
  )
  for (const specifier of stars)
    for (const [name, binding] of namedExports(
      declarationPath(path, specifier),
      active,
    )) {
      if (name === 'default' || named.has(name)) continue
      const previous = result.get(name)
      assert.ok(
        !previous || previous.item === binding.item,
        `${path}: ambiguous export ${name}`,
      )
      result.set(name, binding)
    }
  active.delete(path)
  return result
}

function requiredParameters(binding, seen = new Set()) {
  const { path, item } = binding
  assert.ok(!seen.has(item), `${path}: cyclic declaration alias`)
  seen.add(item)
  if (item.moduleRequest) {
    const name = item.importName.name ?? 'default'
    const target = declarationPath(path, item.moduleRequest.value)
    const imported = namedExports(target).get(name)
    assert.ok(imported, `${target}: missing declaration for ${name}`)
    return requiredParameters(imported, seen)
  }
  return (
    declarationModule(path).declarations.get(item.localName.name) ?? []
  ).filter((parameter) => !parameter.default)
}

function inspectSymbols(exports) {
  const scratch = mkdtempSync(resolve(root, 'tests/consumers/.symbols-'))
  try {
    const filename = resolve(scratch, 'symbols.ts')
    const lines = []
    const probes = new Map()
    for (const [index, exported] of exports.entries()) {
      lines.push(
        `import type { ${exported.name} as Symbol${index} } from ${JSON.stringify(exported.specifier)}`,
      )
      lines.push(`export type Value${index} = typeof Symbol${index}`)
      probes.set(lines.length, { exported, kind: 'value' })
      lines.push(`export type Type${index} = Symbol${index}`)
      probes.set(lines.length, { exported, kind: 'type' })
      exported.value = true
      exported.generic = false
    }
    writeFileSync(filename, lines.join('\n'))
    const config = resolve(scratch, 'tsconfig.json')
    writeFileSync(
      config,
      JSON.stringify({
        compilerOptions: {
          module: 'NodeNext',
          strict: true,
          skipLibCheck: true,
          noEmit: true,
          types: [],
        },
        files: [filename],
      }),
    )
    const result = runTsc(['--project', config, '--pretty', 'false'], {
      cwd: scratch,
    })
    const diagnostics = (result.stdout + result.stderr).trim()
    if (!diagnostics)
      assert.equal(result.status, 0, 'TypeScript export probes failed')
    for (const line of diagnostics ? diagnostics.split(/\r?\n/) : []) {
      const match = /^symbols\.ts\((\d+),\d+\): error TS(\d+):/.exec(line)
      const probe = probes.get(Number(match?.[1]))
      const code = match?.[2]
      if (probe?.kind === 'value' && code === '2693')
        probe.exported.value = false
      else if (probe?.kind === 'type' && ['2314', '2707'].includes(code))
        probe.exported.generic = true
      else if (!(
        probe?.kind === 'type' &&
        probe.exported.value &&
        ['2709', '2749'].includes(code)
      )) {
        throw new Error(
          `Unexpected compiler diagnostic while inspecting consumer exports:\n${line}`,
        )
      }
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
}

const exportsByEntry = entries.map(({ declaration, specifier }) =>
  [...namedExports(declaration)]
    .filter(([name]) => name !== 'default')
    .map(([name, binding]) => ({ name, binding, specifier }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en')),
)
inspectSymbols(exportsByEntry.flat())
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
  ChartLayerDescription: row,
  ChartViewBindings: row,
  NormalizeDatum: "{ id: string; value: number }, 'fraction'",
  PieDatum: '{ id: string; value: number }',
  StackRowsXDatum: "{ id: string; value: number }, string, 'series'",
  StackRowsYDatum: "{ id: string; value: number }, string, 'series'",
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
for (const [index, entry] of entries.entries()) {
  const exports = exportsByEntry[index]
  assert.ok(exports.length, `No named exports: ${entry.specifier}`)
  const fields = exports.map((exported) => {
    let type = exported.name
    if (exported.value) {
      type = `typeof ${type}`
    } else if (exported.generic) {
      const required = requiredParameters(exported.binding)
      assert.ok(
        required.length,
        `Cannot locate type parameters for ${entry.specifier}: ${exported.name}`,
      )
      const args = argumentsByName[exported.name]
      assert.ok(
        args || required.every((parameter) => !parameter.constraint),
        `Add concrete type arguments for ${entry.specifier}: ${exported.name}`,
      )
      type += `<${args ?? required.map(() => 'unknown').join(', ')}>`
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
  if (name === 'sync') expected.push('contracts.ts', 'keyed.ts')
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

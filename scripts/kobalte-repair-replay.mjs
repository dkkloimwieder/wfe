import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, writeFile, mkdir, mkdtemp, cp } from 'node:fs/promises'
import { dirname, resolve, relative, posix, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { parseArgs } from 'node:util'
import * as prettier from 'prettier'
import ts from 'typescript'

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const sourcePath = (path) => (path === 'LICENSE.md' ? path : `packages/${path}`)
function inside(root, path) {
  const full = resolve(root, path)
  assert.ok(full.startsWith(resolve(root) + sep), `Path outside root: ${path}`)
  return full
}

// Only an exact static module specifier is rewritten. New owned-helper imports
// and changed bindings remain in the residual repair patch.
export function redirectUtils(source, path) {
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true)
  const replacements = []
  for (const statement of ast.statements) {
    const specifier =
      (ts.isImportDeclaration(statement) ||
        ts.isExportDeclaration(statement)) &&
      statement.moduleSpecifier
    if (
      specifier &&
      ts.isStringLiteral(specifier) &&
      specifier.text === '@kobalte/utils'
    ) {
      let target = posix.relative(posix.dirname(path), 'utils/src/index.ts')
      if (!target.startsWith('.')) target = './' + target
      replacements.push({
        start: specifier.getStart(ast) + 1,
        end: specifier.getEnd() - 1,
        target,
      })
    }
  }
  for (const replacement of replacements.reverse())
    source =
      source.slice(0, replacement.start) +
      replacement.target +
      source.slice(replacement.end)
  return source
}

export async function replayKobalte({ root, upstream, archive, output }) {
  const vendor = resolve(root, 'packages/components/src/vendor/kobalte')
  const provenanceBytes = await readFile(resolve(vendor, 'provenance.json'))
  const provenance = JSON.parse(provenanceBytes)
  assert.equal(
    hash(await readFile(archive)),
    provenance.archiveSha256,
    'Pinned archive hash',
  )
  const configBytes = await readFile(resolve(root, '.prettierrc.json'))
  const config = JSON.parse(configBytes)
  const manifest = JSON.parse(
    await readFile(resolve(root, 'package.json'), 'utf8'),
  )
  assert.equal(
    prettier.version,
    manifest.devDependencies.prettier,
    'Pinned formatter version',
  )
  const originals = []
  // Verify every input before writing a comparison. Never derive originals by reversing a local patch.
  for (const [path, expected] of Object.entries(provenance.sources)) {
    const original = await readFile(inside(upstream, sourcePath(path)))
    const local = await readFile(inside(vendor, path))
    assert.equal(
      hash(original),
      expected.upstreamSha256,
      `Original hash: ${path}`,
    )
    assert.equal(hash(local), expected.localSha256, `Local hash: ${path}`)
    if (path.endsWith('LICENSE.md'))
      assert.deepEqual(local, original, `Unchanged license: ${path}`)
    originals.push({ path, expected, original, local })
  }
  await mkdir(output, { recursive: true })
  const directory = await mkdtemp(resolve(output, 'kobalte-repairs-'))
  const files = [],
    seams = new Map()
  for (const { path, expected, original, local } of originals) {
    const isSource = /\.tsx?$/.test(path)
    const formatted = isSource
      ? await prettier.format(original.toString(), {
          ...config,
          filepath: path,
        })
      : original
    const adapted = isSource
      ? await prettier.format(redirectUtils(formatted, path), {
          ...config,
          filepath: path,
        })
      : original
    for (const [stage, bytes] of [
      ['original', original],
      ['formatted', formatted],
      ['adapted', adapted],
      ['local', local],
    ]) {
      const target = inside(resolve(directory, stage), path)
      await mkdir(dirname(target), { recursive: true })
      await writeFile(target, bytes)
    }
    const residual = hash(adapted) !== expected.localSha256
    files.push({
      path,
      ...expected,
      formattedSha256: hash(formatted),
      adaptedSha256: hash(adapted),
      residual,
      attribution: residual
        ? 'Review residual patch: runtime, compiler/type, extraction or structural adaptation; not assumed behavior-only.'
        : 'No residual after explicit formatter/import stages.',
    })
    if (isSource) {
      for (const imported of ts.preProcessFile(local.toString(), true)
        .importedFiles) {
        if (!imported.fileName.startsWith('.')) continue
        const target = resolve(
          dirname(resolve(vendor, path)),
          imported.fileName,
        )
        if (target.startsWith(vendor + sep)) continue
        const ownedRoot = resolve(root, 'packages/components/src')
        assert.ok(
          target.startsWith(ownedRoot + sep),
          `Unexpected integration seam: ${path}`,
        )
        const bytes = await readFile(target)
        seams.set(relative(root, target), hash(bytes))
      }
    }
  }
  const stages = [
    ['original', 'formatted', '01-formatting.patch'],
    ['formatted', 'adapted', '02-utils-import-paths.patch'],
    ['adapted', 'local', '03-residual-repairs.patch'],
  ]
  await cp(resolve(directory, 'original'), resolve(directory, 'replayed'), {
    recursive: true,
  })
  const patches = []
  for (const [before, after, name] of stages) {
    const diff = spawnSync(
      'git',
      [
        'diff',
        '--no-index',
        '--no-ext-diff',
        '--no-color',
        '--no-renames',
        '--',
        before,
        after,
      ],
      { cwd: directory, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
    )
    assert.ok(diff.status === 0 || diff.status === 1, diff.stderr)
    await writeFile(resolve(directory, name), diff.stdout)
    if (diff.stdout)
      for (const extra of [['--check'], []]) {
        const applied = spawnSync(
          'git',
          ['apply', ...extra, '-p2', '--directory=replayed', name],
          {
            cwd: directory,
            encoding: 'utf8',
            env: {
              ...process.env,
              GIT_CEILING_DIRECTORIES: dirname(directory),
            },
          },
        )
        assert.equal(applied.status, 0, applied.stderr)
      }
    for (const { path } of originals)
      assert.equal(
        hash(await readFile(inside(resolve(directory, 'replayed'), path))),
        hash(await readFile(inside(resolve(directory, after), path))),
        `Stage replay ${name}: ${path}`,
      )
    patches.push({ name, sha256: hash(diff.stdout) })
  }
  const report = {
    repository: provenance.repository,
    revision: provenance.revision,
    archiveSha256: provenance.archiveSha256,
    provenanceSha256: hash(provenanceBytes),
    toolSha256: hash(await readFile(fileURLToPath(import.meta.url))),
    lockfileSha256: hash(await readFile(resolve(root, 'pnpm-lock.yaml'))),
    parserVersion: ts.version,
    formatter: {
      version: prettier.version,
      entrySha256: hash(
        await readFile(fileURLToPath(import.meta.resolve('prettier'))),
      ),
      configurationSha256: hash(configBytes),
    },
    stages: patches,
    files,
    ownedSeams: Object.fromEntries(seams),
    replay: 'passed',
    limits: [
      'Text replay is not runtime qualification or proof of semantic equivalence.',
      'The residual patch intentionally retains type moves and structural changes alongside behavior repairs. Consult the repair guide; do not count files as repairs.',
      'Owned helper implementations and patched external primitives are required separately. No repair is retired by this comparison.',
    ],
  }
  await writeFile(
    resolve(directory, 'report.json'),
    JSON.stringify(report, null, 2) + '\n',
  )
  return { directory, report }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const { values } = parseArgs({
    options: {
      upstream: { type: 'string' },
      archive: { type: 'string' },
      output: { type: 'string' },
    },
  })
  assert.ok(
    values.upstream && values.archive && values.output,
    'Supply --upstream, --archive and --output',
  )
  const result = await replayKobalte({
    root: resolve(dirname(fileURLToPath(import.meta.url)), '..'),
    ...values,
  })
  console.log(
    JSON.stringify({
      directory: result.directory,
      files: result.report.files.length,
      residualFiles: result.report.files.filter((file) => file.residual).length,
    }),
  )
}

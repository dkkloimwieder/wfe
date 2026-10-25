#!/usr/bin/env node
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import ts from 'typescript'

const vendor = fileURLToPath(
  new URL('../packages/components/src/vendor/dnd-kit/', import.meta.url),
)
const [upstreamArg, outputArg] = process.argv.slice(2)
if (!upstreamArg || !outputArg)
  throw new Error(
    'Usage: node scripts/capture-dnd-kit.mjs <upstream checkout> <empty output directory>',
  )
const upstream = path.resolve(upstreamArg)
const output = path.resolve(outputArg)
const manifest = JSON.parse(
  fs.readFileSync(path.join(vendor, 'provenance.json'), 'utf8'),
)
const hash = (data) => createHash('sha256').update(data).digest('hex')
const patch = fs.readFileSync(path.join(vendor, 'repairs.patch'))
if (hash(patch) !== manifest.repairSha256)
  throw new Error('Repair patch hash mismatch')
if (fs.existsSync(output) && fs.readdirSync(output).length)
  throw new Error('Output directory must be empty')
const sources = new Map(
  Object.entries(manifest.sources).map(([local, source]) => [
    path.resolve(upstream, source.upstreamPath),
    local,
  ]),
)
function resolveImport(base, specifier) {
  let candidate
  if (specifier.startsWith('.'))
    candidate = path.resolve(path.dirname(base), specifier)
  else if (specifier.startsWith('@dnd-kit/')) {
    const [family, ...parts] = specifier.slice(9).split('/')
    candidate = path.join(
      upstream,
      'packages',
      family,
      'src',
      parts.join('/') ||
        (['dom', 'abstract'].includes(family) ? 'core/index' : 'index'),
    )
  } else {
    if (!manifest.externalImports.includes(specifier))
      throw new Error(`Unrecorded external import: ${specifier}`)
    return undefined
  }
  const match = [
    candidate,
    candidate.replace(/\.js$/, '.ts'),
    `${candidate}.ts`,
    path.join(candidate, 'index.ts'),
  ].find((file) => sources.has(file))
  if (!match) throw new Error(`Import outside capture: ${base}: ${specifier}`)
  return sources.get(match)
}
for (const [local, source] of Object.entries(manifest.sources)) {
  const input = path.join(upstream, source.upstreamPath)
  const original = fs.readFileSync(input)
  if (hash(original) !== source.upstreamSha256)
    throw new Error(`Upstream hash mismatch: ${source.upstreamPath}`)
  let text = original.toString()
  if (local.endsWith('.ts')) {
    const parsed = ts.createSourceFile(
      local,
      text,
      ts.ScriptTarget.Latest,
      true,
    )
    const edits = []
    function visit(node) {
      let literal
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      )
        literal = node.moduleSpecifier
      else if (
        ts.isImportTypeNode(node) &&
        ts.isLiteralTypeNode(node.argument) &&
        ts.isStringLiteral(node.argument.literal)
      )
        literal = node.argument.literal
      else if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0])
      )
        literal = node.arguments[0]
      if (literal) {
        const destination = resolveImport(input, literal.text)
        if (destination) {
          let relative = path.posix.relative(
            path.posix.dirname(local),
            destination,
          )
          if (!relative.startsWith('.')) relative = `./${relative}`
          edits.push({
            start: literal.getStart(parsed) + 1,
            end: literal.end - 1,
            text: relative,
          })
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(parsed)
    for (const edit of edits.sort((a, b) => b.start - a.start))
      text = text.slice(0, edit.start) + edit.text + text.slice(edit.end)
  }
  const target = path.join(output, local)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, text)
}
const applied = spawnSync('git', ['apply', '-'], {
  cwd: output,
  input: patch,
  encoding: 'utf8',
})
if (applied.status !== 0)
  throw new Error(`Cannot apply repairs: ${applied.stderr}`)
for (const [local, source] of Object.entries(manifest.sources)) {
  if (hash(fs.readFileSync(path.join(output, local))) !== source.localSha256)
    throw new Error(`Local hash mismatch: ${local}`)
}
for (const support of ['README.md', 'provenance.json', 'repairs.patch'])
  fs.copyFileSync(path.join(vendor, support), path.join(output, support))
console.log(
  `Reproduced ${Object.keys(manifest.sources).length} source/license files at ${manifest.revision}`,
)

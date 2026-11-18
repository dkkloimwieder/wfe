import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  isStringLiteral,
  parseSource,
  staticImportSource,
  walkSource,
} from './lib/source-syntax.mjs'

async function checkPackage(name) {
  const root = fileURLToPath(
    new URL(`../packages/${name}/src/`, import.meta.url),
  )
  const manifest = JSON.parse(
    await readFile(
      new URL(`../packages/${name}/package.json`, import.meta.url),
      'utf8',
    ),
  )
  const allowed = new Set([
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {}),
    ...Object.keys(manifest.devDependencies ?? {}),
  ])
  let count = 0
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name)
      if (entry.isDirectory()) await visit(path)
      else if (/\.tsx?$/.test(entry.name)) {
        count++
        const source = parseSource(path, await readFile(path, 'utf8'))
        walkSource(source, (node) => {
          const specifier =
            node.type === 'ImportExpression'
              ? node.source
              : staticImportSource(node)
          if (specifier) {
            assert.ok(
              isStringLiteral(specifier),
              `${path}: imports must have explicit module paths`,
            )
            const name = specifier.value
            if (name.startsWith('.')) {
              assert.ok(
                resolve(dirname(path), name).startsWith(
                  root.replace(/\/$/, '') + sep,
                ),
                `${path}: import escapes package source: ${name}`,
              )
            } else {
              const packageName = name
                .split('/')
                .slice(0, name.startsWith('@') ? 2 : 1)
                .join('/')
              assert.ok(
                allowed.has(packageName),
                `${path}: undeclared package dependency: ${name}`,
              )
            }
          }
        })
      }
    }
  }
  await visit(root)
  console.log(`Checked import ownership for ${count} ${name} source files`)
}
for (const name of ['components', 'form', 'generator', 'shell', 'sync'])
  await checkPackage(name)

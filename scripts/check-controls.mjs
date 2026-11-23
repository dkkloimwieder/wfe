import {
  checkExampleBoundaries,
  isPrivateUIImport,
} from './check-example-boundaries.mjs'
import { readdir, readFile } from 'node:fs/promises'
import { resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  isStringLiteral,
  parseSource,
  staticImportSource,
  walkSource,
} from './lib/source-syntax.mjs'

// These are capability exceptions, not exclusions from the rest of the guard.
export const controlExceptions = {
  'examples/components/NativeFieldsFixture.tsx': {
    native: true,
    tags: ['option'],
    reason: 'Native browser form interoperability.',
  },
  'examples/form-contract/AssociationCases.tsx': {
    native: true,
    tags: ['option'],
    reason: 'Native field association and hydration interoperability.',
  },
  'examples/theme-explorer/NativeSelectVariant.tsx': {
    native: true,
    tags: ['option'],
    reason:
      'Compare the public native select compatibility control across presets.',
  },
  'examples/styles/index.html': {
    tags: ['button', 'input', 'select', 'textarea', 'option'],
    reason: 'Raw HTML scope isolation and native picker interoperability.',
  },
}
const controlRoles = new Set([
  'combobox',
  'listbox',
  'option',
  'checkbox',
  'radio',
  'switch',
])
const rawControls = new Set(['button', 'input', 'select', 'textarea', 'option'])
export function inspectControls(path, text) {
  const exception = controlExceptions[path]
  const errors = []
  const fail = (position, message) => {
    const line = text.slice(0, position).split(/\r\n|[\n\r\u2028\u2029]/).length
    errors.push(`${path}:${line}: ${message}`)
  }
  const tag = (name, position) => {
    if (rawControls.has(name) && !exception?.tags.includes(name))
      fail(position, `Use a shared component instead of <${name}>.`)
  }
  if (path.endsWith('.html')) {
    const markup = text.replace(/<!--[\s\S]*?-->/g, (value) =>
      value.replace(/[^\n]/g, ' '),
    )
    for (const match of markup.matchAll(
      /<(button|input|select|textarea|option)\b/g,
    ))
      tag(match[1], match.index)
    return errors
  }
  const sourceText = (node) => text.slice(node.start, node.end)
  const native = (node) =>
    fail(
      node.start,
      'NativeSelect is limited to explicit interoperability fixtures.',
    )
  walkSource(parseSource(path, text), (node, parent) => {
    if (node.type === 'JSXOpeningElement') {
      const name = sourceText(node.name)
      tag(name, node.start)
      if (/^[a-z]/.test(name))
        for (const attribute of node.attributes) {
          if (
            attribute.type === 'JSXAttribute' &&
            attribute.name.name === 'role' &&
            isStringLiteral(attribute.value) &&
            controlRoles.has(sourceText(attribute.value).slice(1, -1))
          )
            fail(
              attribute.start,
              'Use a shared component for interactive control roles.',
            )
        }
    }
    const specifier =
      node.type === 'ImportExpression' ? node.source : staticImportSource(node)
    if (isStringLiteral(specifier) && isPrivateUIImport(specifier.value))
      fail(node.start, 'Import shared controls through public package exports.')
    if (exception?.native) return
    if (node.type === 'ImportSpecifier' && node.importKind !== 'type') {
      if ((node.imported.name ?? node.imported.value) === 'NativeSelect')
        native(node)
    } else if (node.type === 'ExportSpecifier' && node.exportKind !== 'type') {
      if ((node.local.name ?? node.local.value) === 'NativeSelect') native(node)
    } else if (
      (node.type === 'Property' &&
        parent.type === 'ObjectPattern' &&
        sourceText(node.key) === 'NativeSelect' &&
        !node.computed) ||
      (node.type === 'RestElement' &&
        (parent.type === 'ObjectPattern' || parent.type === 'ArrayPattern') &&
        sourceText(node.argument) === 'NativeSelect') ||
      (parent?.type === 'ArrayPattern' &&
        ((node.type === 'Identifier' && sourceText(node) === 'NativeSelect') ||
          (node.type === 'AssignmentPattern' &&
            sourceText(node.left) === 'NativeSelect'))) ||
      (node.type === 'MemberExpression' &&
        (node.computed
          ? isStringLiteral(node.property) &&
            node.property.value === 'NativeSelect'
          : node.property.name === 'NativeSelect')) ||
      (node.type === 'JSXMemberExpression' &&
        node.property.name === 'NativeSelect')
    )
      native(node)
  })
  return errors
}
export async function checkControls(root) {
  await checkExampleBoundaries(root)
  const errors = [],
    seen = new Set()
  let count = 0
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
      const path = resolve(directory, entry.name)
      if (entry.isDirectory()) await visit(path)
      else if (/\.(?:[cm]?tsx?|html)$/.test(entry.name)) {
        const name = relative(root, path).replaceAll('\\', '/')
        seen.add(name)
        count++
        errors.push(...inspectControls(name, await readFile(path, 'utf8')))
      }
    }
  }
  await visit(resolve(root, 'examples'))
  for (const name of Object.keys(controlExceptions))
    if (!seen.has(name))
      errors.push(`${name}: Remove the stale control exception.`)
  if (errors.length) throw new Error(errors.join('\n'))
  return count
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  console.log(
    `Checked shared control usage in ${await checkControls(fileURLToPath(new URL('../', import.meta.url)))} example files`,
  )
}

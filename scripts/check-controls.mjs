import {
  checkExampleBoundaries,
  isPrivateUIImport,
} from './check-example-boundaries.mjs'
import { readdir, readFile } from 'node:fs/promises'
import { resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

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
  const source = ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const fail = (position, message) =>
    errors.push(
      `${path}:${source.getLineAndCharacterOfPosition(position).line + 1}: ${message}`,
    )
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
  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const name = node.tagName.getText(source)
      tag(name, node.getStart(source))
      if (/^[a-z]/.test(name))
        for (const attribute of node.attributes.properties) {
          if (
            ts.isJsxAttribute(attribute) &&
            attribute.name.getText(source) === 'role' &&
            attribute.initializer &&
            ts.isStringLiteral(attribute.initializer) &&
            controlRoles.has(attribute.initializer.text)
          )
            fail(
              attribute.getStart(source),
              'Use a shared component for interactive control roles.',
            )
        }
    }
    const specifier =
      ts.isImportDeclaration(node) || ts.isExportDeclaration(node)
        ? node.moduleSpecifier
        : ts.isCallExpression(node) &&
            node.expression.kind === ts.SyntaxKind.ImportKeyword
          ? node.arguments[0]
          : undefined
    if (specifier && ts.isStringLiteral(specifier)) {
      if (isPrivateUIImport(specifier.text))
        fail(
          node.getStart(source),
          'Import shared controls through public package exports.',
        )
    }
    if (!exception?.native) {
      if (
        (ts.isImportSpecifier(node) || ts.isExportSpecifier(node)) &&
        !node.isTypeOnly &&
        (node.propertyName ?? node.name).text === 'NativeSelect'
      )
        fail(
          node.getStart(source),
          'NativeSelect is limited to explicit interoperability fixtures.',
        )
      if (
        ts.isBindingElement(node) &&
        (node.propertyName ?? node.name).getText(source) === 'NativeSelect'
      )
        fail(
          node.getStart(source),
          'NativeSelect is limited to explicit interoperability fixtures.',
        )
      if (
        (ts.isPropertyAccessExpression(node) &&
          node.name.text === 'NativeSelect') ||
        (ts.isElementAccessExpression(node) &&
          ts.isStringLiteral(node.argumentExpression) &&
          node.argumentExpression.text === 'NativeSelect')
      )
        fail(
          node.getStart(source),
          'NativeSelect is limited to explicit interoperability fixtures.',
        )
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
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

import { parseSync, visitorKeys } from 'oxc-parser'

export function parseSource(path, text, options) {
  const { program, errors } = parseSync(path, text, options)
  if (errors.length)
    throw new Error(
      `${path}: ${errors.map(({ message }) => message).join('\n')}`,
    )
  return program
}

export function walkSource(node, visit, parent) {
  visit(node, parent)
  for (const key of visitorKeys[node.type]) {
    const child = node[key]
    if (Array.isArray(child)) {
      for (const item of child) if (item) walkSource(item, visit, node)
    } else if (child) walkSource(child, visit, node)
  }
}

export function staticImportSource(node) {
  switch (node.type) {
    case 'ImportDeclaration':
    case 'ExportNamedDeclaration':
    case 'ExportAllDeclaration':
      return node.source
  }
}

export function isStringLiteral(node) {
  return node?.type === 'Literal' && typeof node.value === 'string'
}

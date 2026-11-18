// Oxlint has no native rules for these two checks. It can parse files without
// imports or exports as scripts, where sloppy syntax is valid.
export default {
  meta: { name: 'js-recommended' },
  rules: {
    'no-dupe-args': {
      create(context) {
        function check({ params }) {
          const names = new Set()
          for (const param of params) {
            // Only a simple parameter list can contain duplicates in a script.
            if (param.type !== 'Identifier') continue
            if (names.has(param.name)) {
              context.report({ node: param, message: 'Duplicate parameter.' })
            }
            names.add(param.name)
          }
        }
        return { FunctionDeclaration: check, FunctionExpression: check }
      },
    },
    'no-octal': {
      create(context) {
        return {
          Literal(node) {
            if (typeof node.value === 'number' && /^0[0-7]+$/.test(node.raw)) {
              context.report({ node, message: 'Use 0o for octal literals.' })
            }
          },
        }
      },
    },
  },
}

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import {
  generateResultSchemas,
  resultSchemaExpression,
} from '../../examples/platform/generate-result-schemas.mjs'

const field = (path, extra = {}) => ({
  path,
  type: 'text',
  nullable: false,
  values: [],
  ...extra,
})
const result = (fields) => ({ class: 'one', fields })
test('generated result schemas match every captured result in separate host namespaces', async () => {
  assert.equal(
    await readFile('examples/platform/result-schemas.generated.ts', 'utf8'),
    await generateResultSchemas(),
  )
})
test('result generation rejects unsupported and ambiguous metadata instead of omitting fields', () => {
  for (const metadata of [
    { class: 'page', fields: [] },
    { class: 'one', fields: [], optional: true },
    result([field('value', { type: 'json' })]),
    result([field('value', { nullable: 'false' })]),
    result([field('value', { optional: true })]),
    result([field('')]),
    result([field('a..b')]),
    result([field('a[][]')]),
    result([field('a[0]')]),
    result([field('a'), field('a')]),
    result([field('a'), field('a.b')]),
    result([field('a.b'), field('a')]),
    result([field('a[].b'), field('a.c')]),
    result([field('a', { values: [1] })]),
    result([field('a', { values: ['x', 'x'] })]),
    result([field('a', { type: 'boolean', values: ['true'] })]),
    result([field('a', { type: 'int32', values: [2147483648] })]),
    result([field('a', { type: 'uuid', values: ['not-a-uuid'] })]),
  ])
    assert.throws(
      () => resultSchemaExpression(metadata),
      JSON.stringify(metadata),
    )
})
test('result generation retains nullable leaves, array levels and safe literal keys', () => {
  const generated = resultSchemaExpression(
    result([
      field('groups[].labels[]', { nullable: true }),
      field('__proto__.constructor'),
    ]),
  )
  assert.match(generated, /z\.array\(z\.nullable\(z\.string\(\)\)\)/)
  assert.match(generated, /\["__proto__"\]/)
  assert.match(generated, /\["constructor"\]/)
  assert.equal(
    generated,
    resultSchemaExpression(
      result([
        field('__proto__.constructor'),
        field('groups[].labels[]', { nullable: true }),
      ]),
    ),
  )
})

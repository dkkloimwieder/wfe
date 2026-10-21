import { expect, test, vi } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  controlResultSchemas,
  applicationResultSchemas,
} from '../../examples/platform/result-schemas.generated'
import { createMetadataInvoke } from '../../examples/platform/metadata-invoke'
import { ENVIRONMENT_STATUS_ROUTE } from '../../examples/platform/snapshot/client/environment'
import { USER_LIST_ROUTE } from '../../examples/platform/snapshot/client/user'
import type {
  JsonValue,
  Outcome,
  Transport,
} from '../../examples/platform/snapshot/runtime/wire'

type Field = {
  path: string
  type: 'text' | 'boolean' | 'uuid' | 'int32'
  nullable: boolean
  values: (string | number | boolean)[]
}
const fixtures: { namespace: string; operation: string; fields: Field[] }[] = []
for (const [namespace, directory] of [
  ['control', 'metadata'],
  ['application', 'application/metadata'],
]) {
  const root = resolve('examples/platform/snapshot', directory!)
  for (const group of readdirSync(root))
    for (const file of readdirSync(resolve(root, group))) {
      if (!file.endsWith('.result.json')) continue
      const metadata = JSON.parse(
        readFileSync(resolve(root, group, file), 'utf8'),
      )
      const operation = JSON.parse(
        readFileSync(
          resolve(root, group, file.replace('.result.json', '.operation.json')),
          'utf8',
        ),
      ).operation
      fixtures.push({
        namespace: namespace!,
        operation,
        fields: metadata.fields,
      })
    }
}
const keys = (path: string) => path.replaceAll('[]', '.0').split('.')
const sample = (field: Field) =>
  field.values[0] ??
  {
    text: 'sample',
    boolean: false,
    uuid: '01234567-89ab-cdef-0123-456789abcdef',
    int32: 1,
  }[field.type]
function baseline(fields: Field[]) {
  const value: Record<string, unknown> = {}
  for (const field of fields) {
    const parts = keys(field.path)
    let current: Record<string, unknown> = value
    for (let index = 0; index < parts.length - 1; index++) {
      const key = parts[index]!
      current[key] ??= parts[index + 1] === '0' ? [] : {}
      current = current[key] as Record<string, unknown>
    }
    current[parts.at(-1)!] = sample(field)
  }
  return value
}
function edit(
  value: Record<string, unknown>,
  path: string[],
  replacement: unknown,
  remove = false,
) {
  const copy = structuredClone(value)
  let current = copy
  for (const part of path.slice(0, -1))
    current = current[part] as Record<string, unknown>
  if (remove) delete current[path.at(-1)!]
  else current[path.at(-1)!] = replacement
  return copy
}
test('registries cover all 24 captured operations without merging host namespaces', () => {
  expect(controlResultSchemas.size).toBe(16)
  expect(applicationResultSchemas.size).toBe(8)
  expect(fixtures).toHaveLength(24)
  expect(controlResultSchemas.get(USER_LIST_ROUTE.operation)).not.toBe(
    applicationResultSchemas.get(USER_LIST_ROUTE.operation),
  )
})
for (const fixture of fixtures)
  test(`${fixture.namespace} ${fixture.operation} enforces every captured leaf and container`, () => {
    const schema = (
      fixture.namespace === 'control'
        ? controlResultSchemas
        : applicationResultSchemas
    ).get(fixture.operation)!
    const value = baseline(fixture.fields)
    expect(schema.safeParse(value).success).toBe(true)
    for (const invalid of [null, [], 'object', 1, false])
      expect(schema.safeParse(invalid).success).toBe(false)
    for (const field of fixture.fields) {
      const path = keys(field.path)
      const accepts = (replacement: unknown) =>
        schema.safeParse(edit(value, path, replacement)).success
      expect(
        accepts(field.type === 'text' || field.type === 'uuid' ? 42 : 'bad'),
        field.path,
      ).toBe(false)
      expect(
        schema.safeParse(edit(value, path, undefined, true)).success,
        field.path,
      ).toBe(false)
      expect(accepts(null), field.path).toBe(field.nullable)
      if (field.type === 'int32') {
        for (const number of [-2147483648, 2147483647])
          expect(accepts(number), field.path).toBe(true)
        for (const number of [-2147483649, 2147483648, 0.1, NaN, Infinity])
          expect(accepts(number), field.path).toBe(false)
      }
      if (field.type === 'uuid') {
        expect(accepts('01234567-89AB-CDEF-0123-456789ABCDEF')).toBe(true)
        expect(accepts('not-a-uuid')).toBe(false)
        expect(accepts('0123456789abcdef0123456789abcdef')).toBe(false)
      }
      if (field.values.length)
        expect(accepts('not-a-declared-value'), field.path).toBe(false)
      else if (field.type === 'text') expect(accepts('')).toBe(true)
      for (let length = 1; length < path.length; length++) {
        const parent = path.slice(0, length)
        expect(schema.safeParse(edit(value, parent, null)).success).toBe(false)
        expect(
          schema.safeParse(edit(value, parent, undefined, true)).success,
        ).toBe(false)
        if (path[length] === '0') {
          expect(schema.safeParse(edit(value, parent, [])).success).toBe(true)
          expect(schema.safeParse(edit(value, parent, {})).success).toBe(false)
          expect(schema.safeParse(edit(value, parent, [null])).success).toBe(
            false,
          )
        }
      }
    }
  })
const request = { ...ENVIRONMENT_STATUS_ROUTE, items: [] }
test('wire validation preserves original outcomes and method receivers before generated renaming', async () => {
  const fixture = fixtures.find(
    (entry) => entry.operation === request.operation,
  )!
  const value = {
    ...baseline(fixture.fields),
    extra: 'keep raw members',
  } as JsonValue
  const outcome: Outcome<JsonValue> = { status: 'completed', value }
  const source = {
    result: outcome,
    async invoke() {
      return this.result
    },
  }
  const invoke = createMetadataInvoke(source, controlResultSchemas).invoke
  expect(await invoke(request)).toBe(outcome)
  expect(((await invoke(request)) as { value: JsonValue }).value).toBe(value)
  const malformed = edit(
    value as Record<string, unknown>,
    ['rollout', 'updated_replicas'],
    'bad',
  ) as JsonValue
  source.result = { status: 'completed', value: malformed }
  expect(await invoke(request)).toMatchObject({
    status: 'uncertain',
    retryRefusal: null,
  })
})
test('unknown operations and unsupported result classes fail before transport invocation', async () => {
  const source: Transport = {
    invoke: vi.fn(async () => ({ status: 'completed', value: {} })),
  }
  const client = createMetadataInvoke(source, controlResultSchemas)
  expect(
    await client.invoke({ ...request, operation: 'unknown' }),
  ).toMatchObject({ status: 'uncertain' })
  expect(
    await client.invoke({
      ...request,
      contract: { ...request.contract, resultClass: 'page' },
    }),
  ).toMatchObject({ status: 'uncertain' })
  expect(source.invoke).not.toHaveBeenCalled()
})
test('refused, uncertain and partial outcomes retain their declared meanings', async () => {
  const outcomes: Outcome<JsonValue>[] = [
    {
      status: 'refused',
      code: 'permission_denied',
      detail: { operation: request.operation },
    },
    { status: 'uncertain', reason: 'unknown completion', retryRefusal: null },
    {
      status: 'partiallyCompleted',
      committedResult: { partial: true },
      failedOutcome: { code: 'failed' },
    },
  ]
  for (const outcome of outcomes) {
    const client = createMetadataInvoke(
      {
        async invoke() {
          return outcome
        },
      },
      controlResultSchemas,
    )
    expect(await client.invoke(request)).toBe(outcome)
  }
})
test('the overlapping user.list identity validates only its selected host shape', () => {
  const entries = fixtures.filter(
    (entry) => entry.operation === USER_LIST_ROUTE.operation,
  )
  expect(entries).toHaveLength(2)
  for (const fixture of entries) {
    const value = baseline(fixture.fields)
    expect(
      controlResultSchemas.get(fixture.operation)!.safeParse(value).success,
    ).toBe(fixture.namespace === 'control')
    expect(
      applicationResultSchemas.get(fixture.operation)!.safeParse(value).success,
    ).toBe(fixture.namespace === 'application')
  }
})

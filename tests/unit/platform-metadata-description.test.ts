import { expect, test } from 'vitest'
import type { FormDescription } from '@wfe/generator'
import {
  metadataFormFields,
  metadataTableColumns,
} from '../../examples/platform/metadata-description'
import input from '../../examples/platform/snapshot/metadata/project/create.input.json'
import projects from '../../examples/platform/snapshot/metadata/project/list.result.json'
import environments from '../../examples/platform/snapshot/metadata/environment/list.result.json'
import status from '../../examples/platform/snapshot/metadata/environment/status.result.json'

const mapping = [
  { path: 'value.project', description: { field: 'project', control: 'text' } },
] as const
const scalar = (path: string, type = 'text') => ({
  path,
  type,
  nullable: false,
  values: [],
})

test('captured create metadata supplies a label while the application supplies the request ID', () => {
  const description = {
    id: 'create',
    fields: metadataFormFields(input, mapping, ['request_id']),
  } satisfies FormDescription<{ project: string }>
  expect(description.fields).toEqual([
    { field: 'project', control: 'text', label: 'Project' },
  ])
  expect(description.fields[0]).not.toHaveProperty('required')
  expect(input.fields[1]).not.toHaveProperty('control')
})

test('application presentation takes precedence', () => {
  const fields = metadataFormFields(
    input,
    [
      {
        path: 'value.project',
        description: {
          field: 'project',
          control: 'text',
          label: 'Application label',
          required: true,
          help: 'Application rule',
        },
      },
    ],
    ['request_id'],
  )
  expect(fields[0]).toEqual({
    field: 'project',
    control: 'text',
    label: 'Application label',
    required: true,
    help: 'Application rule',
  })
})

test('boolean controls are explicit and do not infer required from non-nullability', () => {
  for (const control of ['checkbox', 'switch'] as const) {
    expect(
      metadataFormFields(
        { fields: [scalar('enabled', 'boolean')] },
        [{ path: 'enabled', description: { field: 'enabled', control } }],
        [],
      ),
    ).toEqual([{ field: 'enabled', control, label: 'enabled' }])
  }
})

test.each([
  ['uncovered input', input, mapping, []],
  ['unknown supplied input', input, mapping, ['missing']],
  ['duplicate supplied input', input, mapping, ['request_id', 'request_id']],
  [
    'supplied and editable input overlap',
    input,
    mapping,
    ['request_id', 'value.project'],
  ],
  ['duplicate editable path', input, [...mapping, ...mapping], ['request_id']],
  [
    'unknown editable path',
    input,
    [{ path: 'other', description: mapping[0].description }],
    ['request_id'],
  ],
  [
    'duplicate form key',
    { fields: [scalar('a'), scalar('b')] },
    [
      { path: 'a', description: mapping[0].description },
      { path: 'b', description: mapping[0].description },
    ],
    [],
  ],
  [
    'incompatible control',
    { fields: [scalar('value.project', 'boolean')] },
    mapping,
    [],
  ],
  [
    'nullable input',
    { fields: [{ ...scalar('value.project'), nullable: true }] },
    mapping,
    [],
  ],
  [
    'editable enum',
    { fields: [{ ...scalar('value.project'), values: ['x'] }] },
    mapping,
    [],
  ],
  [
    'nested path',
    { fields: [scalar('value.inner.project')] },
    [{ path: 'value.inner.project', description: mapping[0].description }],
    [],
  ],
  [
    'repeated path',
    { fields: [scalar('value[].project')] },
    [{ path: 'value[].project', description: mapping[0].description }],
    [],
  ],
  [
    'duplicate metadata path',
    { fields: [scalar('value.project'), scalar('value.project')] },
    mapping,
    [],
  ],
  [
    'unknown constraint annotation',
    { fields: [{ ...scalar('value.project'), maxLength: 40 }] },
    mapping,
    [],
  ],
] as const)('rejects %s', (_name, metadata, mappings, supplied) => {
  expect(() => metadataFormFields(metadata, mappings, supplied)).toThrow()
})

test('captured list records map only to application column IDs', () => {
  for (const [metadata, root] of [
    [projects, 'projects'],
    [environments, 'environments'],
  ] as const) {
    const columns = metadataTableColumns(
      metadata,
      root,
      {
        title: { path: `${root}[].name`, label: 'Name' },
        state: { path: `${root}[].state` },
      },
      ['next_cursor', 'total'],
    )
    expect(columns).toEqual({
      title: { label: 'Name' },
      state: { label: 'state' },
    })
    expect(columns).not.toHaveProperty('actions')
  }
})

test('table scalar metadata supplies labels without inferring rendering or actions', () => {
  expect(
    metadataTableColumns(
      {
        class: 'one',
        fields: [
          { ...scalar('rows[].count', 'int32'), label: 'Count' },
          scalar('rows[].active', 'boolean'),
        ],
      },
      'rows',
      { count: { path: 'rows[].count' }, active: { path: 'rows[].active' } },
    ),
  ).toEqual({ count: { label: 'Count' }, active: { label: 'active' } })
})

test.each([
  ['unsupported nested status result', status],
  [
    'unsupported int64',
    { class: 'one', fields: [scalar('rows[].name', 'int64')] },
  ],
  [
    'nullable column',
    { class: 'one', fields: [{ ...scalar('rows[].name'), nullable: true }] },
  ],
  [
    'enum type mismatch',
    { class: 'one', fields: [{ ...scalar('rows[].name'), values: [1] }] },
  ],
  [
    'enum integer out of range',
    {
      class: 'one',
      fields: [{ ...scalar('rows[].name', 'int32'), values: [2147483648] }],
    },
  ],
  ['nested result', { class: 'one', fields: [scalar('rows[].child.name')] }],
  ['unknown result class', { class: 'many', fields: [scalar('rows[].name')] }],
  ['malformed metadata', { fields: null }],
] as const)('rejects %s', (_name, metadata) => {
  expect(() =>
    metadataTableColumns(metadata, 'rows', { name: { path: 'rows[].name' } }),
  ).toThrow()
})

test('list mappings reject other roots, uncovered fields, and duplicate paths', () => {
  expect(() =>
    metadataTableColumns(
      projects,
      'environments',
      {
        name: { path: 'projects[].name' },
        state: { path: 'projects[].state' },
      },
      ['next_cursor', 'total'],
    ),
  ).toThrow()
  expect(() =>
    metadataTableColumns(
      projects,
      'projects',
      {
        name: { path: 'projects[].name' },
      },
      ['next_cursor', 'total'],
    ),
  ).toThrow(/Unmapped/)
  expect(() =>
    metadataTableColumns(
      projects,
      'projects',
      {
        name: { path: 'projects[].name' },
        state: { path: 'projects[].name' },
      },
      ['next_cursor', 'total'],
    ),
  ).toThrow(/repeated mapping/)
})

test('resolved labels replace an explicit undefined label', () => {
  const fields = metadataFormFields(
    input,
    [
      {
        path: 'value.project',
        description: { field: 'project', control: 'text', label: undefined },
      },
    ],
    ['request_id'],
  )
  const label: string = fields[0]!.label
  expect(label).toBe('Project')
})

test.each(['', '   '])(
  'rejects blank explicit and metadata labels: %j',
  (label) => {
    expect(() =>
      metadataFormFields(
        input,
        [
          {
            path: 'value.project',
            description: { field: 'project', control: 'text', label },
          },
        ],
        ['request_id'],
      ),
    ).toThrow()
    expect(() =>
      metadataFormFields(
        { fields: [{ ...scalar('value.project'), label }] },
        mapping,
        [],
      ),
    ).toThrow()
    expect(() =>
      metadataTableColumns(projects, 'projects', {
        name: { path: 'projects[].name', label },
        state: { path: 'projects[].state' },
      }),
    ).toThrow()
  },
)

test('metadata and mappings remain unchanged when frozen', () => {
  const metadata = Object.freeze({
    fields: Object.freeze([
      Object.freeze({
        ...scalar('value.project'),
        values: Object.freeze([]),
        label: 'Project',
      }),
    ]),
  })
  const mappings = Object.freeze([
    Object.freeze({
      path: 'value.project',
      description: Object.freeze({
        field: 'project',
        control: 'text' as const,
      }),
    }),
  ])
  expect(metadataFormFields(metadata, mappings, Object.freeze([]))).toEqual([
    { field: 'project', control: 'text', label: 'Project' },
  ])
  const result = Object.freeze({
    class: 'one',
    fields: Object.freeze([
      Object.freeze({ ...scalar('rows[].name'), values: Object.freeze([]) }),
    ]),
  })
  const columns = Object.freeze({
    name: Object.freeze({ path: 'rows[].name' }),
  })
  expect(metadataTableColumns(result, 'rows', columns)).toEqual({
    name: { label: 'name' },
  })
})

test('list envelope metadata must be acknowledged explicitly and cannot hide row fields', () => {
  const mapping = {
    name: { path: 'projects[].name' },
    state: { path: 'projects[].state' },
  }
  expect(() => metadataTableColumns(projects, 'projects', mapping)).toThrow()
  for (const envelope of [
    ['next_cursor', 'total', 'missing'],
    ['next_cursor', 'next_cursor', 'total'],
    ['next_cursor', 'total', 'projects[].state'],
  ])
    expect(() =>
      metadataTableColumns(projects, 'projects', mapping, envelope),
    ).toThrow()
  expect(
    metadataTableColumns(projects, 'projects', mapping, [
      'next_cursor',
      'total',
    ]),
  ).toEqual({ name: { label: 'name' }, state: { label: 'state' } })
})

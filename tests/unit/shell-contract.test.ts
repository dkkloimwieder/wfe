import { expect, test } from 'vitest'
import { defineShell } from '@wfe/shell'

const description = {
  id: 'workspace',
  title: 'Workspace',
  audiences: [
    { id: 'operations', label: 'Operations' },
    { id: 'research', label: 'Research' },
  ],
  routes: [
    { id: 'home', label: 'Home', view: 'summary' },
    {
      id: 'queue',
      label: 'Queue',
      view: 'records',
      audience: 'operations',
      parent: 'home',
    },
    {
      id: 'reports',
      label: 'Reports',
      view: 'summary',
      audience: 'research',
      parent: 'home',
    },
  ],
} as const

test('keeps original metadata and literal IDs through serialization', () => {
  const d = Object.freeze(description)
  expect(defineShell(d)).toBe(d)
  expect(defineShell(JSON.parse(JSON.stringify(d)))).toEqual(d)
})

test.each([
  ['root', null],
  ['extra property', { ...description, session: {} }],
  ['ID', { ...description, id: ' ' }],
  ['title', { ...description, title: '' }],
  ['no audiences', { ...description, audiences: [] }],
  ['no routes', { ...description, routes: [] }],
  ['invalid audience', { ...description, audiences: [null] }],
  [
    'audience label',
    { ...description, audiences: [{ id: 'operations', label: '' }] },
  ],
  [
    'duplicate audience',
    {
      ...description,
      audiences: [description.audiences[0], description.audiences[0]],
    },
  ],
  [
    'audience permission property',
    {
      ...description,
      audiences: [{ ...description.audiences[0], permission: 'admin' }],
    },
  ],
  ['invalid route', { ...description, routes: [null] }],
  [
    'route label',
    { ...description, routes: [{ ...description.routes[0], label: '' }] },
  ],
  [
    'view',
    {
      ...description,
      routes: [{ ...description.routes[0], view: () => null }],
    },
  ],
  [
    'route handler',
    {
      ...description,
      routes: [{ ...description.routes[0], onClick: () => {} }],
    },
  ],
  [
    'unknown audience',
    {
      ...description,
      routes: [{ ...description.routes[0], audience: 'unknown' }],
    },
  ],
  [
    'duplicate route',
    { ...description, routes: [description.routes[0], description.routes[0]] },
  ],
  [
    'unknown parent',
    {
      ...description,
      routes: [{ ...description.routes[0], parent: 'missing' }],
    },
  ],
  [
    'self parent',
    { ...description, routes: [{ ...description.routes[0], parent: 'home' }] },
  ],
  [
    'parent cycle',
    {
      ...description,
      routes: [
        { id: 'a', label: 'A', view: 'summary', parent: 'b' },
        { id: 'b', label: 'B', view: 'summary', parent: 'a' },
      ],
    },
  ],
])('rejects malformed %s metadata', (name, value) => {
  expect(() => defineShell(value as never)).toThrow(/^Shell:/)
  void name
})

test('validates a deep parent chain without recursion or metadata mutation', () => {
  const routes = Array.from({ length: 2000 }, (_, i) => ({
    id: String(i),
    label: String(i),
    view: 'page',
    parent: i === 0 ? undefined : String(i - 1),
  })).reverse()
  const d = { ...description, routes }
  expect(defineShell(d)).toBe(d)
  expect(routes[0]?.id).toBe('1999')
})

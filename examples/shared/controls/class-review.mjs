import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

export const initialClassTokens = [
  'caller-a',
  'caller-shared',
  'caller-on',
  'caller-nested',
  '0',
  '23',
]

export async function reviewStructuredClasses(page, configure, configureMap) {
  const nodes = page.locator('[data-class-base]')
  assert.ok(
    (await nodes.count()) >= 35,
    'Exercise native, styled, composed, layout and table wrappers',
  )
  const original = await nodes.elementHandles()
  async function classes(expected) {
    for (const node of await nodes.all()) {
      const base = (await node.getAttribute('data-class-base')).split(/\s+/)
      await expect
        .poll(async () => node.evaluate((node) => [...node.classList].sort()))
        .toEqual([...new Set([...expected, ...base])].sort())
    }
  }
  await classes(initialClassTokens)
  for (const [value, expected] of [
    [
      [
        'caller-b',
        [
          {
            'caller-next': true,
            'caller-a': false,
            'ui-button': false,
            'ui-card': false,
            'ui-toggle': false,
          },
        ],
        null,
        false,
        7,
      ],
      ['caller-b', 'caller-next', '7'],
    ],
    [
      {
        'caller-object caller-pair': true,
        'caller-b': false,
        'caller-absent': undefined,
      },
      ['caller-object', 'caller-pair'],
    ],
    ['caller-string', ['caller-string']],
    [0, ['0']],
    [true, []],
    [false, []],
    [null, []],
    [undefined, []],
  ]) {
    await configure(value)
    await classes(expected)
  }
  if (configureMap) {
    for (const nested of [false, true]) {
      for (const enabled of [true, false, true]) {
        await configureMap(enabled, nested)
        await classes([
          ...(enabled ? ['caller-live'] : []),
          ...(nested ? ['caller-map-array'] : []),
        ])
      }
    }
  }
  for (const node of original)
    assert.equal(
      await node.evaluate((node) => node.isConnected),
      true,
      'Class updates preserve existing nodes',
    )
}

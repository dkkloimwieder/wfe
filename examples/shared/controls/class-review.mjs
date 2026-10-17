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
  const associations = () =>
    nodes.evaluateAll((nodes) =>
      nodes.map((node) => ({
        id: node.id,
        for: node.getAttribute('for'),
        labelled: node.getAttribute('aria-labelledby'),
        described: node.getAttribute('aria-describedby'),
      })),
    )
  const originalAssociations = await associations()
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
    assert.deepEqual(await associations(), originalAssociations)
  }
  if (configureMap) {
    for (const nested of [false, true]) {
      for (const enabled of [true, false, true]) {
        await configureMap(enabled, nested)
        await classes([
          ...(enabled ? ['caller-live'] : []),
          ...(nested ? ['caller-map-array'] : []),
        ])
        assert.deepEqual(await associations(), originalAssociations)
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

export async function reviewDynamicIds(page, configure) {
  const parts = page.locator('[data-id-part]')
  const original = await parts.elementHandles()
  const ids = () => parts.evaluateAll((nodes) => nodes.map((node) => node.id))
  const defaults = await ids()
  assert.ok(defaults.every(Boolean))
  assert.equal(new Set(defaults).size, defaults.length)
  for (const suffix of ['a', 'b', undefined]) {
    await configure(suffix)
    if (suffix) {
      for (const part of await parts.all()) {
        const name = await part.getAttribute('data-id-part')
        await expect(part).toHaveAttribute(
          'id',
          'dynamic-' + name.replaceAll('.', '-') + '-' + suffix,
        )
      }
    } else assert.deepEqual(await ids(), defaults)
    for (const [inputPart, labelPart] of [
      ['Checkbox.Input', 'Checkbox.Label'],
      ['Switch.Input', 'Switch.Label'],
      ['RadioGroup.ItemInput', 'RadioGroup.ItemLabel'],
      ['Select.Trigger', 'Select.Label'],
      ['Combobox.Input', 'Combobox.Label'],
    ]) {
      const control = page.locator('[data-id-part="' + inputPart + '"]')
      const label = page.locator('[data-id-part="' + labelPart + '"]')
      if (inputPart !== 'Select.Trigger')
        await expect(label).toHaveAttribute(
          'for',
          await control.getAttribute('id'),
        )
      const labelId = await label.getAttribute('id')
      const references = await control.evaluate((node) =>
        ['aria-labelledby', 'aria-describedby']
          .flatMap((name) =>
            (node.getAttribute(name) ?? '').split(/\s+/).filter(Boolean),
          )
          .map((id) => ({ id, connected: !!document.getElementById(id) })),
      )
      assert.ok(references.every((reference) => reference.connected))
      assert.ok(references.some((reference) => reference.id === labelId))
    }
    for (const node of original)
      assert.equal(
        await node.evaluate((node) => node.isConnected),
        true,
        await node.getAttribute('data-id-part'),
      )
  }
}

export async function reviewChoiceMetadata(page, configure) {
  const part = (name) => page.locator(`[data-id-part="${name}"]`)
  const controls = { Select: 'Select.Trigger', Combobox: 'Combobox.Input' }
  const references = (control) =>
    control.evaluate((node) => ({
      label: (node.getAttribute('aria-labelledby') ?? '').split(/\s+/),
      described: (node.getAttribute('aria-describedby') ?? '').split(/\s+/),
    }))
  for (const family of Object.keys(controls)) {
    const label = part(family + '.Label')
    assert.equal(
      await label.evaluate((node) => node.tagName),
      family === 'Select' ? 'STRONG' : 'LABEL',
    )
    assert.equal(
      await part(family + '.Description').evaluate((node) => node.tagName),
      'P',
    )
    assert.equal(
      await part(family + '.ErrorMessage').evaluate((node) => node.tagName),
      'SPAN',
    )
  }
  const nodes = await page
    .locator('[data-id-part^="Select."], [data-id-part^="Combobox."]')
    .elementHandles()
  for (const invalid of [false, true]) {
    await configure({ invalid, forceMount: true })
    for (const [family, control] of Object.entries(controls)) {
      const linked = await references(part(control))
      assert.ok(
        linked.label.includes(await part(family + '.Label').getAttribute('id')),
      )
      assert.ok(
        linked.described.includes(
          await part(family + '.Description').getAttribute('id'),
        ),
      )
      assert.equal(
        linked.described.includes(
          await part(family + '.ErrorMessage').getAttribute('id'),
        ),
        invalid,
      )
    }
    for (const node of nodes)
      assert.equal(await node.evaluate((node) => node.isConnected), true)
  }
  await configure({ invalid: false, forceMount: false })
  for (const [family, control] of Object.entries(controls)) {
    assert.equal(await part(family + '.ErrorMessage').count(), 0)
    const linked = await references(part(control))
    assert.equal(linked.described.filter(Boolean).length, 1)
  }
  await configure({ invalid: true, forceMount: true })
  for (const [family, control] of Object.entries(controls)) {
    await expect(part(family + '.ErrorMessage')).toHaveCount(1)
    const linked = await references(part(control))
    assert.ok(
      linked.described.includes(
        await part(family + '.ErrorMessage').getAttribute('id'),
      ),
    )
  }
}

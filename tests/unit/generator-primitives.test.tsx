import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@solidjs/testing-library'
import { flush } from 'solid-js'
import { DetailView } from '@wfe/generator'
import {
  isFormColumnCount,
  isFormSpan,
  requireObject,
  requireText,
  requireKeys,
} from '../../packages/generator/src/guards'
import { createGridModel } from '../../packages/generator/src/gridModel'
import { validateRepeatedDescription } from '../../packages/generator/src/repeatedField'

afterEach(cleanup)

test('form layout predicates retain inclusive spans and reject coercion', () => {
  for (const columns of [1, 2, 3]) {
    expect(isFormColumnCount(columns)).toBe(true)
    for (const span of [undefined, 'full', 1, columns])
      expect(isFormSpan(span, columns)).toBe(true)
    for (const span of [0, columns + 1, 1.5, '1', null, false])
      expect(isFormSpan(span, columns)).toBe(false)
  }
  for (const columns of [0, 4, '2', null, undefined, 1.5])
    expect(isFormColumnCount(columns)).toBe(false)
})

test('shared guards retain descriptor-owned messages and Grid strictness', () => {
  expect(() => requireObject([], 'chart')).toThrow('Generator: invalid chart')
  expect(() => requireText(' ', 'axis')).toThrow('Generator: invalid axis')
  expect(() => requireKeys({ extra: true }, [], 'axis')).toThrow(
    'Generator: unsupported axis property "extra"',
  )
  expect(() =>
    createGridModel({ id: 'grid', rows: [], columns: [], extra: true }),
  ).toThrow('Generator: unsupported grid description property "extra"')
  expect(createGridModel({ id: 'grid', rows: [], columns: [] }).rows.size).toBe(
    0,
  )
})

test('repeated descriptors retain preflight rejection of invalid optional column metadata', () => {
  const field = {
    field: 'rows',
    control: 'repeat',
    fields: [{ field: 'name', control: 'text' }],
  } as const
  expect(() => validateRepeatedDescription(field)).not.toThrow()
  const invalid: Parameters<typeof validateRepeatedDescription>[0] = {
    ...field,
    // @ts-expect-error Deliberately invalid runtime metadata must still fail preflight.
    columns: null,
  }
  expect(() => validateRepeatedDescription(invalid)).toThrow(
    'unsupported repeated column count',
  )
  expect(() =>
    validateRepeatedDescription({
      ...field,
      columns: 1,
      fields: [{ field: 'name', control: 'text', span: 2 }],
    }),
  ).toThrow('unsupported span for field "name"')
})

test('detail actions share one row in description order with native non-submit behavior', () => {
  const first = vi.fn(),
    second = vi.fn()
  const h = render(() => (
    <DetailView
      description={
        {
          id: 'detail-actions',
          fields: [{ field: 'name' }],
          actions: [
            { id: 'first', label: 'First' },
            { id: 'second', label: 'Second' },
          ],
        } as const
      }
      bindings={{
        record: () => ({ name: 'Record' }),
        actions: { first: { run: first }, second: { run: second } },
      }}
    />
  ))
  flush()
  const buttons = h.getAllByRole('button') as HTMLButtonElement[]
  expect(buttons.map((button) => button.textContent)).toEqual([
    'First',
    'Second',
  ])
  expect(buttons[0]!.parentElement).toBe(buttons[1]!.parentElement)
  expect(buttons[0]!.parentElement!.classList.contains('ui-form-actions')).toBe(
    true,
  )
  expect(buttons.map((button) => button.type)).toEqual(['button', 'button'])
  fireEvent.click(buttons[1]!)
  expect(second).toHaveBeenCalledTimes(1)
  expect(first).not.toHaveBeenCalled()
})

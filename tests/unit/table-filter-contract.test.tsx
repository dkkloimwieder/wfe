import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@solidjs/testing-library'
import { createSignal, flush, untrack } from 'solid-js'
import {
  TableColumnFilter,
  TableHeaderFilter,
  TableFilter,
  createTable,
  createTableFilterDraft,
  fromLegacyTableFilterValue,
  toLegacyTableFilterValue,
} from '@wfe/components/table'
import type {
  TableColumnFilterConfig,
  TableFilterValue,
  TableColumnFilterValue,
  TableFilterCriteria,
} from '@wfe/components/table'

beforeEach(() =>
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  })),
)
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function mount(
  placement: 'header' | 'panel',
  config: TableColumnFilterConfig,
  initial?: TableFilterValue,
) {
  const changes: (TableFilterValue | undefined)[] = []
  const applied = vi.fn<(criteria: TableFilterCriteria) => void>()
  let draft!: ReturnType<typeof createTableFilterDraft>
  let table!: ReturnType<typeof createTable>
  const view = render(() => {
    table = createTable<unknown>({
      source: { ids: () => [], get: () => undefined },
      columns: [{ id: 'value' }],
      manualProcessing: true,
      initialState: {
        columnFilters:
          initial === undefined ? [] : [{ id: 'value', value: initial }],
      },
    })
    draft = createTableFilterDraft(table, { onApply: applied })
    const props = {
      label: 'Value',
      clearLabel: 'Clear Value',
      config,
      get value() {
        return draft.getValue('value') as TableFilterValue | undefined
      },
      onValueChange(value: TableFilterValue | undefined) {
        changes.push(value)
        draft.setValue('value', value)
      },
    }
    return placement === 'header' ? (
      <TableHeaderFilter {...props} columnId="value" columnLabel="Value" />
    ) : (
      <TableColumnFilter {...props} />
    )
  })
  flush()
  return { ...view, changes, applied, draft, table }
}

for (const placement of ['header', 'panel'] as const) {
  test(`${placement} text commits composition once and keeps server criteria pending until apply`, () => {
    const h = mount(placement, { kind: 'text' })
    const input = h.getByLabelText<HTMLInputElement>('Value', {
      selector: 'input',
    })
    fireEvent.compositionStart(input)
    fireEvent.input(input, { target: { value: '字' }, isComposing: true })
    flush()
    expect(h.changes).toEqual([])
    expect(input.value).toBe('字')
    fireEvent.compositionEnd(input)
    flush()
    fireEvent.input(input, {
      target: { value: '字' },
      isComposing: false,
      inputType: 'insertCompositionText',
    })
    flush()
    const criterion = { operator: 'contains', value: '字' }
    expect(h.changes).toEqual([criterion])
    expect(untrack(() => h.draft.getValue('value'))).toEqual(criterion)
    expect(h.applied).not.toHaveBeenCalled()
    expect(h.table.state.columnFilters).toEqual([])
    h.draft.apply()
    flush()
    expect(h.applied).toHaveBeenCalledExactlyOnceWith({
      globalFilter: '',
      columnFilters: [{ id: 'value', value: criterion }],
    })
    expect(h.table.state.columnFilters).toEqual([])
    fireEvent.input(input, { target: { value: '' } })
    flush()
    expect(h.changes.at(-1)).toBeUndefined()
  })

  test(`${placement} boolean cycles true, false and absent without losing false`, () => {
    const h = mount(placement, { kind: 'boolean' })
    const input = h.getByLabelText<HTMLInputElement>('Value', {
      selector: 'input',
    })
    fireEvent.click(input)
    flush()
    fireEvent.click(input)
    flush()
    expect(h.changes).toEqual([true, false])
    expect(input.checked).toBe(false)
    expect(input.indeterminate).toBe(false)
    if (placement === 'header')
      expect(
        h.container
          .querySelector('[data-header-filter]')
          ?.getAttribute('data-filtered'),
      ).toBe('true')
    h.draft.apply()
    flush()
    expect(h.applied).toHaveBeenCalledExactlyOnceWith({
      globalFilter: '',
      columnFilters: [{ id: 'value', value: false }],
    })
    fireEvent.click(input)
    flush()
    expect(h.changes).toEqual([true, false, undefined])
  })

  test(`${placement} numeric range retains zero and independent empty bounds`, () => {
    const h = mount(placement, { kind: 'number-range' })
    const min = h.getByLabelText('Value minimum')
    const max = h.getByLabelText('Value maximum')
    fireEvent.input(min, { target: { value: '0' } })
    flush()
    fireEvent.input(max, { target: { value: '12' } })
    flush()
    expect(untrack(() => h.draft.getValue('value'))).toEqual({
      operator: 'between',
      min: 0,
      max: 12,
    })
    fireEvent.input(max, { target: { value: '' } })
    flush()
    expect(untrack(() => h.draft.getValue('value'))).toEqual({
      operator: 'between',
      min: 0,
      max: undefined,
    })
    fireEvent.input(min, { target: { value: '' } })
    flush()
    expect(h.changes.at(-1)).toBeUndefined()
  })

  test(`${placement} date range keeps date-only boundaries and clears independently`, () => {
    const h = mount(placement, { kind: 'date-range' })
    fireEvent.input(h.getByLabelText('Value start'), {
      target: { value: '2026-01-01' },
    })
    flush()
    fireEvent.input(h.getByLabelText('Value end'), {
      target: { value: '2026-02-01' },
    })
    flush()
    expect(untrack(() => h.draft.getValue('value'))).toEqual({
      start: '2026-01-01',
      end: '2026-02-01',
    })
    fireEvent.click(h.getByLabelText('Clear Value start'))
    flush()
    expect(untrack(() => h.draft.getValue('value'))).toEqual({
      start: undefined,
      end: '2026-02-01',
    })
    fireEvent.click(h.getByLabelText('Clear Value end'))
    flush()
    expect(h.changes.at(-1)).toBeUndefined()
  })

  for (const kind of ['select', 'multi-select', 'tags'] as const) {
    test(`${placement} ${kind} retains accepted choices and clears to absent`, () => {
      const criterion: TableFilterValue = {
        operator: kind === 'tags' ? 'all' : 'in',
        values: ['a'],
      }
      const h = mount(
        placement,
        { kind, choices: [{ value: 'a', label: 'Alpha' }] },
        criterion,
      )
      expect(h.container.textContent).toContain('Alpha')
      h.draft.apply({ refresh: true })
      flush()
      expect(h.applied).toHaveBeenCalledExactlyOnceWith({
        globalFilter: '',
        columnFilters: [{ id: 'value', value: criterion }],
      })
      fireEvent.click(h.getByLabelText('Clear Value'))
      flush()
      expect(h.changes).toEqual([undefined])
    })
  }

  test(`${placement} empty criterion is active and clears without manufacturing a text value`, () => {
    const h = mount(
      placement,
      { kind: 'text', empty: true },
      { operator: 'empty' },
    )
    expect(h.queryByLabelText('Value', { selector: 'input' })).toBeNull()
    h.draft.apply({ refresh: true })
    flush()
    expect(h.applied).toHaveBeenCalledExactlyOnceWith({
      globalFilter: '',
      columnFilters: [{ id: 'value', value: { operator: 'empty' } }],
    })
    fireEvent.click(h.getByLabelText('Clear Value'))
    flush()
    expect(h.changes).toEqual([undefined])
  })
}

test('legacy simple controls retain string callbacks in both placements', () => {
  for (const header of [false, true]) {
    const changes: string[] = []
    const h = render(() => {
      const [value, setValue] = createSignal('')
      const props = {
        label: 'Legacy',
        clearLabel: 'Clear legacy',
        get value() {
          return value()
        },
        onValueChange(next: string) {
          changes.push(next)
          setValue(next)
        },
      }
      return header ? (
        <TableHeaderFilter {...props} columnId="legacy" columnLabel="Legacy" />
      ) : (
        <TableFilter {...props} />
      )
    })
    fireEvent.input(h.getByLabelText('Legacy', { selector: 'input' }), {
      target: { value: '0' },
    })
    flush()
    fireEvent.click(h.getByLabelText('Clear legacy'))
    flush()
    expect(changes).toEqual(['0', ''])
    h.unmount()
  }
})

test('explicit legacy adapters preserve false and zero text and reject lossy conversions', () => {
  expect(fromLegacyTableFilterValue('false', 'boolean')).toBe(false)
  expect(toLegacyTableFilterValue(false, 'boolean')).toBe('false')
  expect(fromLegacyTableFilterValue('0')).toEqual({
    operator: 'contains',
    value: '0',
  })
  expect(toLegacyTableFilterValue({ operator: 'contains', value: '0' })).toBe(
    '0',
  )
  expect(fromLegacyTableFilterValue('a', 'select')).toEqual({
    operator: 'in',
    values: ['a'],
  })
  expect(
    toLegacyTableFilterValue({ operator: 'in', values: ['a'] }, 'select'),
  ).toBe('a')
  expect(fromLegacyTableFilterValue('')).toBeUndefined()
  expect(toLegacyTableFilterValue(undefined)).toBe('')
  expect(() => toLegacyTableFilterValue({ operator: 'empty' })).toThrow(
    /cannot be represented/,
  )
  expect(() =>
    toLegacyTableFilterValue({ operator: 'in', values: ['a', 'b'] }, 'select'),
  ).toThrow(/cannot be represented/)
})

for (const placement of ['header', 'panel'] as const) {
  test(`${placement} rejected composition publishes one request and restores the accepted value`, () => {
    const requested =
      vi.fn<(value: TableColumnFilterValue | undefined) => void>()
    const props = {
      label: 'Rejected text',
      clearLabel: 'Clear rejected text',
      config: { kind: 'text' as const },
      value: { operator: 'contains' as const, value: 'accepted' },
      onValueChange: requested,
    }
    const h = render(() =>
      placement === 'header' ? (
        <TableHeaderFilter
          {...props}
          columnId="rejected"
          columnLabel="Rejected"
        />
      ) : (
        <TableColumnFilter {...props} />
      ),
    )
    const input = h.getByLabelText<HTMLInputElement>('Rejected text', {
      selector: 'input',
    })
    fireEvent.compositionStart(input)
    fireEvent.input(input, { target: { value: '字' }, isComposing: true })
    fireEvent.compositionEnd(input)
    flush()
    fireEvent.input(input, {
      target: { value: '字' },
      isComposing: false,
      inputType: 'insertCompositionText',
    })
    flush()
    expect(requested).toHaveBeenCalledExactlyOnceWith({
      operator: 'contains',
      value: '字',
    })
    expect(input.value).toBe('accepted')
  })
}

for (const placement of ['header', 'panel'] as const) {
  test(`${placement} a rejected composition without trailing input does not suppress later text`, async () => {
    const requested =
      vi.fn<(value: TableColumnFilterValue | undefined) => void>()
    const props = {
      label: 'Later text',
      clearLabel: 'Clear later text',
      config: { kind: 'text' as const },
      value: { operator: 'contains' as const, value: 'accepted' },
      onValueChange: requested,
    }
    const h = render(() =>
      placement === 'header' ? (
        <TableHeaderFilter {...props} columnId="later" columnLabel="Later" />
      ) : (
        <TableColumnFilter {...props} />
      ),
    )
    const input = h.getByLabelText<HTMLInputElement>('Later text', {
      selector: 'input',
    })
    fireEvent.compositionStart(input)
    fireEvent.input(input, { target: { value: '字' }, isComposing: true })
    fireEvent.compositionEnd(input)
    flush()
    expect(requested).toHaveBeenCalledTimes(1)
    await Promise.resolve()
    fireEvent.input(input, {
      target: { value: '字' },
      isComposing: false,
      inputType: 'insertFromPaste',
    })
    flush()
    expect(requested).toHaveBeenCalledTimes(2)
    expect(requested).toHaveBeenLastCalledWith({
      operator: 'contains',
      value: '字',
    })
    expect(input.value).toBe('accepted')
  })
}

for (const placement of ['header', 'panel'] as const) {
  test(`${placement} delayed marked completion is deduplicated while later text and paste remain requests`, async () => {
    const requested =
      vi.fn<(value: TableColumnFilterValue | undefined) => void>()
    const props = {
      label: 'Delayed composition',
      clearLabel: 'Clear delayed composition',
      config: { kind: 'text' as const },
      value: { operator: 'contains' as const, value: 'accepted' },
      onValueChange: requested,
    }
    const h = render(() =>
      placement === 'header' ? (
        <TableHeaderFilter
          {...props}
          columnId="delayed"
          columnLabel="Delayed"
        />
      ) : (
        <TableColumnFilter {...props} />
      ),
    )
    const input = h.getByLabelText<HTMLInputElement>('Delayed composition', {
      selector: 'input',
    })
    for (const inputType of [
      'insertCompositionText',
      'insertFromComposition',
    ]) {
      requested.mockClear()
      fireEvent.compositionStart(input)
      fireEvent.input(input, {
        target: { value: '字' },
        isComposing: true,
        inputType: 'insertCompositionText',
      })
      fireEvent.compositionEnd(input)
      flush()
      await Promise.resolve()
      fireEvent.input(input, {
        target: { value: '字' },
        isComposing: false,
        inputType,
      })
      flush()
      expect(requested).toHaveBeenCalledExactlyOnceWith({
        operator: 'contains',
        value: '字',
      })
      expect(input.value).toBe('accepted')
      for (const ordinary of ['insertText', 'insertFromPaste']) {
        fireEvent.input(input, {
          target: { value: '字' },
          isComposing: false,
          inputType: ordinary,
        })
        flush()
      }
      expect(requested).toHaveBeenCalledTimes(3)
      expect(input.value).toBe('accepted')
    }
  })
}

for (const placement of ['header', 'panel'] as const) {
  test(`${placement} forwards reactive messages to canonical date criteria`, () => {
    const [messages, setMessages] = createSignal({
      dateStart: (label: string) => `Inicio ${label}`,
      dateEnd: (label: string) => `Fin ${label}`,
      filter: (label: string) => `Filtrar ${label}`,
    })
    const change = vi.fn()
    const props = {
      label: 'Date',
      config: { kind: 'date-range' as const },
      value: { start: '2026-10-01' },
      onValueChange: change,
      get messages() {
        return messages()
      },
    }
    const h = render(() =>
      placement === 'header' ? (
        <TableHeaderFilter {...props} columnId="date" columnLabel="Date" />
      ) : (
        <TableColumnFilter {...props} />
      ),
    )
    const input = h.getByLabelText('Inicio Date')
    setMessages({
      dateStart: (label) => `Start ${label}`,
      dateEnd: (label) => `End ${label}`,
      filter: (label) => `Filter ${label}`,
    })
    flush()
    expect(h.getByLabelText('Start Date')).toBe(input)
    expect(change).not.toHaveBeenCalled()
    if (placement === 'header')
      expect(h.getByRole('button', { name: 'Filter Date' })).toBeTruthy()
  })
}

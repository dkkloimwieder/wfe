import { action, createRoot, createSignal, flush, untrack } from 'solid-js'
import { afterEach, expect, test, vi } from 'vitest'
import { createForm } from '@wfe/form'
import type { FormBindings, FormErrors } from '@wfe/form'
interface Row {
  key: string
  name: string
  quantity: number | null
  active: boolean
}
interface Values {
  title: string
  entries: readonly Row[]
}
const seed = (): Values => ({
  title: 'List',
  entries: [
    { key: 'a', name: 'First', quantity: 0, active: false },
    { key: 'b', name: 'Second', quantity: null, active: true },
  ],
})
const stops: Array<() => void> = []
afterEach(() => {
  for (const stop of stops.splice(0)) stop()
  flush()
})
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
function harness(
  overrides: Partial<Pick<FormBindings<Values>, 'validate' | 'onSubmit'>> = {},
) {
  const h = createRoot((dispose) => {
    const [values, setValues] = createSignal<Readonly<Values>>(seed())
    const [defaults, setDefaults] = createSignal<Readonly<Values>>(seed())
    let rejected = false
    const change = vi.fn((next: Readonly<Values>) => {
      if (!rejected) setValues(next)
    })
    const validate = vi.fn<FormBindings<Values>['validate']>(
      overrides.validate ?? (() => ({})),
    )
    const submit = vi.fn<FormBindings<Values>['onSubmit']>(
      overrides.onSubmit ?? (() => ({ ok: true })),
    )
    const form = createForm<Values>({
      values,
      defaults,
      onValuesChange: change,
      validate,
      onSubmit: submit,
    })
    return {
      values,
      setValues,
      defaults,
      setDefaults,
      change,
      validate,
      submit,
      form,
      dispose,
      reject: (next: boolean) => {
        rejected = next
      },
    }
  })
  // eslint-disable-next-line require-yield -- Disposal uses the existing synchronous action boundary.
  const stop = action(function* () {
    h.dispose()
  })
  stops.push(stop)
  flush()
  return {
    ...h,
    stop,
    read: <T>(read: () => T) => {
      flush()
      return untrack(read)
    },
  }
}
test('scalar row interfaces support equal immutable replacements without dirty or cancelled work', async () => {
  const pending = deferred<FormErrors<Values>>()
  const h = harness({ validate: () => pending.promise })
  const first = h.form.submit()
  h.setValues(seed())
  flush()
  expect(h.read(() => h.form.dirty)).toBe(false)
  expect(h.read(() => h.form.pending)).toBe(true)
  expect(h.form.submit()).toBe(first)
  pending.resolve({})
  expect(await first).toEqual({ status: 'success' })
  expect(h.validate).toHaveBeenCalledTimes(1)
  expect(h.submit).toHaveBeenCalledTimes(1)
  const [snapshot] = h.validate.mock.calls[0]!
  expect(h.submit.mock.calls[0]?.[0]).toBe(snapshot)
  expect(Object.isFrozen(snapshot.entries)).toBe(true)
  expect(Object.isFrozen(snapshot.entries[0])).toBe(true)
  expect(Reflect.set(snapshot.entries[0]!, 'name', 'Changed')).toBe(false)
})
test('rejected repeated requests preserve accepted values and pending validation', async () => {
  const pending = deferred<FormErrors<Values>>()
  const h = harness({ validate: () => pending.promise })
  const first = h.form.submit()
  h.reject(true)
  const row = { key: 'c', name: 'Third', quantity: 2, active: false }
  h.form.setValue('entries', [...h.values().entries, row])
  expect(h.change).toHaveBeenCalledTimes(1)
  expect(h.values()).toEqual(seed())
  expect(h.read(() => h.form.pending)).toBe(true)
  expect(Object.isFrozen(row)).toBe(false)
  expect(Object.isFrozen(h.change.mock.calls[0]![0].entries)).toBe(true)
  pending.resolve({})
  expect(await first).toEqual({ status: 'success' })
})
test.each(['add', 'remove', 'reorder', 'edit'] as const)(
  'accepted %s cancels pending validation and ignores its late row errors',
  async (operation) => {
    const pending = deferred<FormErrors<Values>>()
    const h = harness({ validate: () => pending.promise })
    const first = h.form.submit()
    const rows = h.values().entries
    const next =
      operation === 'add'
        ? [...rows, { ...rows[0]!, key: 'c' }]
        : operation === 'remove'
          ? rows.slice(1)
          : operation === 'reorder'
            ? [...rows].reverse()
            : rows.map((row) =>
                row.key === 'a' ? { ...row, name: 'Edited' } : row,
              )
    h.form.setValue('entries', next)
    expect(await first).toEqual({ status: 'cancelled' })
    expect(h.validate.mock.calls[0]![1].signal.aborted).toBe(true)
    pending.resolve({ rows: { entries: { a: { row: 'Old error' } } } })
    await Promise.resolve()
    flush()
    expect(h.read(() => h.form.errors)).toEqual({})
    expect(h.submit).not.toHaveBeenCalled()
    expect(h.read(() => h.form.dirty)).toBe(true)
  },
)
test.each([{ row: 'Row error' }, { fields: { name: 'Name error' } }])(
  'row-only validation errors block submission: %j',
  async (rowError) => {
    const h = harness({
      validate: () => ({ rows: { entries: { b: rowError } } }),
    })
    expect(await h.form.submit()).toEqual({ status: 'invalid' })
    expect(h.submit).not.toHaveBeenCalled()
    expect(h.read(() => h.form.errors.rows?.entries?.b)).toEqual({
      ...rowError,
      fields: rowError.fields ?? {},
    })
    expect(Object.isFrozen(h.read(() => h.form.errors.rows))).toBe(true)
    expect(Object.isFrozen(h.read(() => h.form.errors.rows?.entries))).toBe(
      true,
    )
    expect(
      Object.isFrozen(h.read(() => h.form.errors.rows?.entries?.b?.fields)),
    ).toBe(true)
  },
)
test('application reply row errors are copied without freezing or retaining the original objects', async () => {
  const original = {
    rows: {
      entries: {
        a: { fields: { quantity: 'Application error' }, row: 'Check row' },
      },
    },
  }
  const h = harness({ onSubmit: () => ({ ok: false, errors: original }) })
  expect(await h.form.submit()).toEqual({ status: 'rejected' })
  original.rows.entries.a.fields.quantity = 'Changed later'
  expect(h.read(() => h.form.errors.rows?.entries?.a?.fields?.quantity)).toBe(
    'Application error',
  )
  expect(Object.isFrozen(original.rows.entries.a)).toBe(false)
})
test('mutating application rows cannot change an existing submission snapshot', async () => {
  const pending = deferred<FormErrors<Values>>()
  const h = harness({ validate: () => pending.promise })
  const external = {
    ...seed(),
    entries: [{ key: 'x', name: 'Original', quantity: 1, active: true }],
  }
  h.setValues(external)
  flush()
  const first = h.form.submit()
  external.entries[0]!.name = 'External mutation'
  expect(h.validate.mock.calls[0]![0].entries[0]!.name).toBe('Original')
  expect(Object.isFrozen(external.entries[0])).toBe(false)
  pending.resolve({})
  expect(await first).toEqual({ status: 'cancelled' })
  expect(h.submit).not.toHaveBeenCalled()
})
test('reset uses copied current defaults and leaves application defaults mutable', () => {
  const h = harness()
  const defaults = {
    ...seed(),
    entries: [{ key: 'x', name: 'Default', quantity: 1, active: false }],
  }
  h.setDefaults(defaults)
  flush()
  h.form.reset()
  flush()
  expect(h.values()).toEqual(defaults)
  expect(h.values().entries).not.toBe(defaults.entries)
  expect(h.read(() => h.form.dirty)).toBe(false)
  defaults.entries[0]!.name = 'Later default'
  expect(h.values().entries[0]!.name).toBe('Default')
})
test.each([
  { entries: [{ nested: {} }] },
  { entries: [[1]] },
  { entries: [new Date()] },
  { entries: [null] },
  { entries: ['text'] },
])('rejects unsupported repeated data %j', ({ entries }) => {
  const dispose = createRoot((dispose) => {
    expect(() =>
      createForm<Values>({
        values: () => ({ title: '', entries: entries as unknown as Row[] }),
        defaults: seed,
        onValuesChange() {},
        validate: () => ({}),
        onSubmit: () => ({ ok: true }),
      }),
    ).toThrow('scalars or lists of scalar records')
    return dispose
  })
  dispose()
})
test('disposal cancels pending repeated submissions and ignores late callbacks', async () => {
  const pending = deferred<FormErrors<Values>>()
  const h = harness({ validate: () => pending.promise })
  const first = h.form.submit()
  h.stop()
  expect(await first).toEqual({ status: 'disposed' })
  pending.resolve({})
  await Promise.resolve()
  flush()
  h.form.setValue('entries', [])
  expect(h.change).not.toHaveBeenCalled()
  expect(h.submit).not.toHaveBeenCalled()
})

test('rejects hidden row properties instead of silently removing submitted data', () => {
  const row = Object.defineProperty(
    { key: 'x', name: 'Name', quantity: 0, active: false },
    'hidden',
    { value: 'Secret', enumerable: false },
  )
  const dispose = createRoot((dispose) => {
    expect(() =>
      createForm<Values>({
        values: () => ({ title: '', entries: [row] }),
        defaults: seed,
        onValuesChange() {},
        validate: () => ({}),
        onSubmit: () => ({ ok: true }),
      }),
    ).toThrow('scalars or lists of scalar records')
    return dispose
  })
  dispose()
})

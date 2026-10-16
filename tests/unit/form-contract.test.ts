import { action, createRoot, createSignal, flush, untrack } from 'solid-js'
import { describe, expect, it, vi } from 'vitest'
import { createForm } from '@wfe/form'
import { initialValues } from '../../examples/form-contract/values'
import type { ExampleValues } from '../../examples/form-contract/values'
import type { FormBindings, FormErrors, FormReply, FormScalar } from '@wfe/form'
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
function harness(
  overrides: Partial<
    Pick<FormBindings<ExampleValues>, 'validate' | 'onSubmit'>
  > = {},
) {
  return genericHarness(initialValues, overrides)
}
function genericHarness<T extends object & { [K in keyof T]: FormScalar }>(
  initial: Readonly<T>,
  overrides: Partial<Pick<FormBindings<T>, 'validate' | 'onSubmit'>> = {},
) {
  const root = createRoot((dispose) => {
    const [values, setValues] = createSignal<Readonly<T>>(() => ({
      ...initial,
    }))
    const [defaults, setDefaults] = createSignal<Readonly<T>>(() => ({
      ...initial,
    }))
    let rejects = false
    const change = vi.fn((next: Readonly<T>) => {
      if (!rejects) setValues(() => next)
    })
    const validate = vi.fn<FormBindings<T>['validate']>(
      overrides.validate ?? (() => ({})),
    )
    const submit = vi.fn<FormBindings<T>['onSubmit']>(
      overrides.onSubmit ?? (() => ({ ok: true })),
    )
    const readValues = vi.fn(values)
    const form = createForm<T>({
      values: readValues,
      defaults,
      onValuesChange: change,
      validate,
      onSubmit: submit,
    })
    return {
      dispose,
      readValues,
      values,
      setValues,
      defaults,
      setDefaults,
      change,
      validate,
      submit,
      form,
      reject: (value: boolean) => {
        rejects = value
      },
    }
  })
  // eslint-disable-next-line require-yield -- Use the qualified synchronous disposal path.
  const stop = action(function* () {
    root.dispose()
  })
  flush()
  return {
    ...root,
    read: <T>(fn: () => T) => {
      flush()
      return untrack(fn)
    },
    begin: () => {
      flush()
      const result = root.form.submit()
      flush()
      return result
    },
    stop: () => {
      stop()
      flush()
    },
  }
}
async function settle() {
  await Promise.resolve()
  await Promise.resolve()
  flush()
}

describe('public form contract', () => {
  it('reads only accepted application values and resets to the latest defaults', () => {
    const h = harness()
    try {
      h.reject(true)
      h.form.setValue('name', 'Rejected')
      h.form.setValue('category', 'Research')
      h.form.setValue('enabled', true)
      expect(h.read(() => h.form.values)).toEqual(initialValues)
      expect(h.read(() => h.form.dirty)).toBe(false)
      h.reject(false)
      h.form.setValue('enabled', true)
      expect(h.read(() => h.form.values.enabled)).toBe(true)
      expect(h.read(() => h.form.dirty)).toBe(true)
      h.setDefaults({
        name: 'New default',
        category: 'Research',
        enabled: false,
      })
      flush()
      h.form.reset()
      expect(h.read(() => h.form.values)).toEqual(h.read(h.defaults))
      expect(h.read(() => h.form.dirty)).toBe(false)
    } finally {
      h.stop()
    }
  })
  it('validates only explicit submissions and exposes field, form and unexpected failures for retry', async () => {
    const h = harness({
      validate: (snapshot) =>
        snapshot.name ? {} : { fields: { name: 'Required' } },
    })
    try {
      h.form.setValue('name', '')
      expect(h.validate).not.toHaveBeenCalled()
      expect(await h.begin()).toEqual({ status: 'invalid' })
      expect(h.submit).not.toHaveBeenCalled()
      expect(h.read(() => h.form.errors.fields?.name)).toBe('Required')
      h.form.setValue('name', 'Ready')
      expect(h.read(() => h.form.errors)).toEqual({})
      h.submit.mockReturnValueOnce({ ok: false, errors: { form: 'Rejected' } })
      expect(await h.begin()).toEqual({ status: 'rejected' })
      expect(h.read(() => h.form.errors.form)).toBe('Rejected')
      const error = new Error('offline')
      h.submit.mockImplementationOnce(() => {
        throw error
      })
      expect(await h.begin()).toEqual({ status: 'error', error })
      expect(h.read(() => h.form.failure)).toBe(error)
      expect(await h.begin()).toEqual({ status: 'success' })
      expect(h.read(() => h.form.failure)).toBeUndefined()
    } finally {
      h.stop()
    }
  })
  it('deduplicates pending validation and supplies one immutable snapshot and identity to both callbacks', async () => {
    const validation = deferred<FormErrors<ExampleValues>>()
    const h = harness({ validate: () => validation.promise })
    try {
      const first = h.begin()
      expect(h.begin()).toBe(first)
      expect(h.validate).toHaveBeenCalledTimes(1)
      const [snapshot, context] = h.validate.mock.calls[0]!
      expect(Object.isFrozen(snapshot)).toBe(true)
      expect(Reflect.set(snapshot, 'name', 'mutated')).toBe(false)
      expect(Object.isFrozen(context)).toBe(true)
      expect(h.read(() => h.form.phase)).toBe('validating')
      h.setDefaults({ ...initialValues, name: 'New baseline' })
      flush()
      expect(h.read(() => h.form.pending)).toBe(true)
      validation.resolve({})
      expect(await first).toEqual({ status: 'success' })
      expect(h.submit.mock.calls[0]?.[0]).toBe(snapshot)
      expect(h.submit.mock.calls[0]?.[1]).toBe(context)
      expect(h.read(h.values)).toEqual(initialValues)
      expect(h.read(() => h.form.dirty)).toBe(true)
    } finally {
      h.stop()
    }
  })
  it('cancels accepted edits and external replacements, while rejected or equivalent changes preserve pending work', async () => {
    const validation = deferred<FormErrors<ExampleValues>>()
    const h = harness({ validate: () => validation.promise })
    try {
      const pending = h.begin()
      h.reject(true)
      h.form.setValue('name', 'Rejected')
      expect(h.validate.mock.calls[0]?.[1].signal.aborted).toBe(false)
      h.setValues({ ...initialValues })
      flush()
      expect(h.read(() => h.form.pending)).toBe(true)
      h.setValues({ ...initialValues, name: 'External' })
      flush()
      expect(await pending).toEqual({ status: 'cancelled' })
      expect(h.validate.mock.calls[0]?.[1].signal.aborted).toBe(true)
      validation.resolve({ fields: { name: 'Late error' } })
      await settle()
      expect(h.submit).not.toHaveBeenCalled()
      expect(h.read(() => h.form.errors)).toEqual({})
      expect(h.read(() => h.form.values.name)).toBe('External')
    } finally {
      h.stop()
    }
  })
  it('cancels promptly and ignores old submission replies after a retry', async () => {
    const old = deferred<FormReply<ExampleValues>>()
    const fresh = deferred<FormReply<ExampleValues>>()
    let count = 0
    const h = harness({
      onSubmit: () => (++count === 1 ? old.promise : fresh.promise),
    })
    try {
      const first = h.begin()
      await settle()
      expect(h.read(() => h.form.phase)).toBe('submitting')
      h.form.cancel()
      expect(await first).toEqual({ status: 'cancelled' })
      const second = h.begin()
      await settle()
      expect(h.submit.mock.calls[1]![1].attempt).toBeGreaterThan(
        h.submit.mock.calls[0]![1].attempt,
      )
      old.resolve({ ok: false, errors: { form: 'Stale rejection' } })
      await settle()
      expect(h.read(() => h.form.phase)).toBe('submitting')
      expect(h.read(() => h.form.errors)).toEqual({})
      fresh.resolve({ ok: true })
      expect(await second).toEqual({ status: 'success' })
    } finally {
      h.stop()
    }
  })
  it('reset cancels work even when the application rejects resetting values', async () => {
    const validation = deferred<FormErrors<ExampleValues>>()
    const h = harness({ validate: () => validation.promise })
    try {
      h.form.setValue('name', 'Changed')
      const pending = h.begin()
      h.reject(true)
      h.form.reset()
      expect(await pending).toEqual({ status: 'cancelled' })
      expect(h.read(() => h.form.values.name)).toBe('Changed')
      expect(h.read(() => h.form.dirty)).toBe(true)
      validation.reject(new Error('Late rejection'))
      await settle()
      expect(h.read(() => h.form.phase)).toBe('idle')
      expect(h.read(() => h.form.failure)).toBeUndefined()
    } finally {
      h.stop()
    }
  })
  it('disposal aborts validation, settles the pending result and leaves stale methods inert', async () => {
    const validation = deferred<FormErrors<ExampleValues>>()
    const h = harness({ validate: () => validation.promise })
    const pending = h.begin()
    h.stop()
    expect(await pending).toEqual({ status: 'disposed' })
    expect(h.validate.mock.calls[0]![1].signal.aborted).toBe(true)
    h.form.setValue('name', 'Detached')
    h.form.reset()
    h.form.cancel()
    expect(await h.begin()).toEqual({ status: 'disposed' })
    expect(h.change).not.toHaveBeenCalled()
    validation.resolve({})
    await settle()
    expect(h.submit).not.toHaveBeenCalled()
  })
  it('captures asynchronous validation failures without calling submission', async () => {
    const h = harness({
      validate: () => Promise.reject('validation unavailable'),
    })
    try {
      expect(await h.begin()).toEqual({
        status: 'error',
        error: 'validation unavailable',
      })
      expect(h.submit).not.toHaveBeenCalled()
      expect(h.read(() => h.form.failure)).toBe('validation unavailable')
    } finally {
      h.stop()
    }
  })
})

interface InventoryValues {
  title: string
  quantity: number
  available: boolean
  note?: string | null
  priority: number | undefined
}
const inventory: InventoryValues = {
  title: 'Stock',
  quantity: 0,
  available: false,
  priority: undefined,
}

describe('generic field records', () => {
  it('supports interfaces, optional fields and scalar equality without a declared key list', () => {
    const h = genericHarness(inventory)
    try {
      h.form.setValue('quantity', 12)
      flush()
      h.form.setValue('available', true)
      flush()
      h.form.setValue('note', null)
      expect(h.read(() => h.form.values)).toEqual({
        ...inventory,
        quantity: 12,
        available: true,
        note: null,
      })
      expect(h.read(() => h.form.dirty)).toBe(true)
      h.form.reset()
      expect(h.read(() => h.form.dirty)).toBe(false)
      h.form.setValue('note', undefined)
      expect(h.read(() => h.form.dirty)).toBe(true)
      h.setDefaults({ ...inventory, note: undefined })
      expect(h.read(() => h.form.dirty)).toBe(false)
      h.setDefaults(inventory)
      flush()
      h.form.reset()
      flush()
      h.form.setValue('quantity', -0)
      expect(h.read(() => h.form.dirty)).toBe(true)
      h.setDefaults({ ...inventory, quantity: NaN })
      h.form.setValue('quantity', NaN)
      expect(h.read(() => h.form.dirty)).toBe(false)
    } finally {
      h.stop()
    }
  })
  it('blocks validation errors for absent optional fields and preserves immutable feedback', async () => {
    const h = genericHarness(inventory, {
      validate: (snapshot) =>
        snapshot.note ? {} : { fields: { note: 'Enter a note.' } },
    })
    try {
      expect(await h.begin()).toEqual({ status: 'invalid' })
      expect(h.submit).not.toHaveBeenCalled()
      const errors = h.read(() => h.form.errors)
      expect(errors.fields?.note).toBe('Enter a note.')
      expect(Object.isFrozen(errors)).toBe(true)
      expect(Object.isFrozen(errors.fields)).toBe(true)
      h.form.setValue('note', 'Ready')
      expect(h.read(() => h.form.errors)).toEqual({})
      expect(await h.begin()).toEqual({ status: 'success' })
      expect(h.submit.mock.calls[0]?.[0]).toEqual({
        ...inventory,
        note: 'Ready',
      })
    } finally {
      h.stop()
    }
  })
  it('cancels changed numeric values and optional key additions while preserving equivalent replacements', async () => {
    const validation = deferred<FormErrors<InventoryValues>>()
    const h = genericHarness(inventory, { validate: () => validation.promise })
    try {
      const first = h.begin()
      h.setValues({ ...inventory })
      expect(h.read(() => h.form.pending)).toBe(true)
      h.form.setValue('quantity', 1)
      flush()
      expect(await first).toEqual({ status: 'cancelled' })
      const second = h.begin()
      h.setValues({ ...inventory, quantity: 1, note: undefined })
      flush()
      expect(await second).toEqual({ status: 'cancelled' })
      expect(
        h.validate.mock.calls.every((call) => call[1].signal.aborted),
      ).toBe(true)
      validation.resolve({ fields: { note: 'Stale' } })
      await settle()
      expect(h.submit).not.toHaveBeenCalled()
      expect(h.read(() => h.form.errors)).toEqual({})
    } finally {
      h.stop()
    }
  })
})

it('disposal releases value subscriptions and stale methods do not read or request values', async () => {
  const h = genericHarness(inventory)
  h.stop()
  const reads = h.readValues.mock.calls.length
  h.setValues({ ...inventory, title: 'After disposal' })
  flush()
  expect(h.read(h.values).title).toBe('After disposal')
  h.form.setValue('title', 'Detached edit')
  h.form.reset()
  h.form.cancel()
  expect(await h.form.submit()).toEqual({ status: 'disposed' })
  expect(h.readValues).toHaveBeenCalledTimes(reads)
  expect(h.change).not.toHaveBeenCalled()
})

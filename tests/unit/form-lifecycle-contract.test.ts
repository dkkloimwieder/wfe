import { expect, test, vi } from 'vitest'
import { action, createRoot, createSignal, flush, untrack } from 'solid-js'
import { createForm } from '@wfe/form'
import type { FormContext, FormReply } from '@wfe/form'

type Values = { name: string }
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
function owned<T extends { dispose: () => void }>(root: T) {
  // eslint-disable-next-line require-yield -- Use the qualified synchronous disposal path.
  const stop = action(function* () {
    root.dispose()
  })
  return {
    ...root,
    stop: () => {
      stop()
      flush()
    },
  }
}

test.each(['success', 'invalid', 'rejected', 'error'] as const)(
  'cancel clears settled %s feedback without altering its outcome or values',
  async (phase) => {
    const failure = new Error('Submission failed')
    const h = owned(
      createRoot((dispose) => {
        const [values, setValues] = createSignal<Values>({ name: 'Accepted' })
        const validate = vi.fn(() =>
          phase === 'invalid' ? { fields: { name: 'Invalid name' } } : {},
        )
        const submit = vi.fn((): FormReply<Values> => {
          if (phase === 'error') throw failure
          return phase === 'rejected'
            ? { ok: false, errors: { form: 'Rejected record' } }
            : { ok: true }
        })
        const change = vi.fn((next: Readonly<Values>) => setValues(next))
        const form = createForm<Values>({
          values,
          defaults: values,
          onValuesChange: change,
          validate,
          onSubmit: submit,
        })
        return { dispose, form, validate, submit, change }
      }),
    )
    try {
      const pending = h.form.submit()
      const outcome = await pending
      flush()
      expect(outcome.status).toBe(phase)
      expect(untrack(() => h.form.phase)).toBe(phase)
      if (phase === 'invalid' || phase === 'rejected')
        expect(untrack(() => h.form.errors)).not.toEqual({})
      if (phase === 'error') expect(untrack(() => h.form.failure)).toBe(failure)
      h.form.cancel()
      flush()
      expect(
        untrack(() => ({
          phase: h.form.phase,
          pending: h.form.pending,
          errors: h.form.errors,
          failure: h.form.failure,
          values: h.form.values,
        })),
      ).toEqual({
        phase: 'idle',
        pending: false,
        errors: {},
        failure: undefined,
        values: { name: 'Accepted' },
      })
      expect(await pending).toBe(outcome)
      expect(h.validate).toHaveBeenCalledTimes(1)
      expect(h.submit).toHaveBeenCalledTimes(phase === 'invalid' ? 0 : 1)
      expect(h.change).not.toHaveBeenCalled()
    } finally {
      h.stop()
    }
  },
)

test.each(['unequal', 'equivalent', 'defaults'] as const)(
  'publication of %s values during submission follows accepted-value identity',
  async (publication) => {
    const started = deferred<FormContext>()
    const reply = deferred<FormReply<Values>>()
    const h = owned(
      createRoot((dispose) => {
        const [values, setValues] = createSignal<Values>({ name: 'Accepted' })
        const [defaults, setDefaults] = createSignal<Values>({
          name: 'Accepted',
        })
        const submit = vi.fn(
          (_snapshot: Readonly<Values>, context: FormContext) => {
            if (publication === 'defaults')
              setDefaults({ name: 'Different default' })
            else
              setValues({
                name: publication === 'unequal' ? 'Replacement' : 'Accepted',
              })
            started.resolve(context)
            return reply.promise
          },
        )
        const form = createForm<Values>({
          values,
          defaults,
          onValuesChange: setValues,
          validate: () => ({}),
          onSubmit: submit,
        })
        return { dispose, form, submit }
      }),
    )
    try {
      const pending = h.form.submit()
      const context = await started.promise
      flush()
      if (publication === 'unequal') {
        expect(await pending).toEqual({ status: 'cancelled' })
        expect(context.signal.aborted).toBe(true)
        expect(untrack(() => h.form.phase)).toBe('idle')
      } else {
        expect(context.signal.aborted).toBe(false)
        expect(untrack(() => h.form.pending)).toBe(true)
      }
      reply.resolve({ ok: true })
      const outcome = await pending
      await Promise.resolve()
      flush()
      expect(outcome.status).toBe(
        publication === 'unequal' ? 'cancelled' : 'success',
      )
      expect(untrack(() => h.form.phase)).toBe(
        publication === 'unequal' ? 'idle' : 'success',
      )
      expect(untrack(() => h.form.values.name)).toBe(
        publication === 'unequal' ? 'Replacement' : 'Accepted',
      )
      expect(untrack(() => h.form.dirty)).toBe(publication !== 'equivalent')
      expect(h.submit).toHaveBeenCalledTimes(1)
    } finally {
      h.stop()
    }
  },
)

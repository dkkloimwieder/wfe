import { createEffect, createSignal, onCleanup, untrack } from 'solid-js'
import type {
  FormBindings,
  FormContract,
  FormErrors,
  FormOutcome,
  FormPhase,
} from './contract'
import { fields } from './values'
import type { ExampleValues } from './values'

type Snapshot = Readonly<ExampleValues>
type Attempt = {
  id: number
  snapshot: Snapshot
  controller: AbortController
  promise: Promise<FormOutcome>
  resolve: (outcome: FormOutcome) => void
}
const copy = (values: Snapshot): Snapshot => Object.freeze({ ...values })
const same = (left: Snapshot, right: Snapshot) =>
  fields.every((field) => Object.is(left[field], right[field]))
const hasErrors = (errors: FormErrors<ExampleValues>) =>
  Boolean(errors.form || fields.some((field) => errors.fields?.[field]))

/** Concrete three-field reference, not the reusable form package. */
export function createExampleForm(
  bindings: FormBindings<ExampleValues>,
): FormContract<ExampleValues> {
  const [phase, setPhase] = createSignal<FormPhase>('idle')
  const [errors, setErrors] = createSignal<FormErrors<ExampleValues>>({})
  const [failure, setFailure] = createSignal<unknown>(undefined)
  let alive = true
  let sequence = 0
  let active: Attempt | undefined
  let accepted = copy(untrack(bindings.values))
  function clear() {
    setPhase('idle')
    setErrors({})
    setFailure(undefined)
  }
  function cancel(status: 'cancelled' | 'disposed' = 'cancelled') {
    const run = active
    active = undefined
    if (alive) clear()
    if (run) {
      run.resolve({ status })
      run.controller.abort()
    }
  }
  function accept(next: Snapshot) {
    if (same(next, accepted)) return
    accepted = copy(next)
    cancel()
  }
  function synchronize() {
    accept(untrack(bindings.values))
  }
  createEffect(
    () => copy(bindings.values()),
    (value) => {
      accept(value)
    },
    { defer: true },
  )
  onCleanup(() => {
    alive = false
    cancel('disposed')
  })
  function current(run: Attempt) {
    if (!alive || active !== run) return false
    synchronize()
    return active === run
  }
  function finish(run: Attempt, outcome: FormOutcome) {
    if (!current(run)) return
    active = undefined
    run.resolve(outcome)
  }
  function publishErrors(value: FormErrors<ExampleValues>) {
    setErrors(
      Object.freeze({
        fields: Object.freeze({ ...value.fields }),
        form: value.form,
      }),
    )
  }
  async function execute(run: Attempt) {
    const context = Object.freeze({
      attempt: run.id,
      signal: run.controller.signal,
    })
    try {
      const issues = await bindings.validate(run.snapshot, context)
      if (!current(run)) return
      if (hasErrors(issues)) {
        publishErrors(issues)
        setPhase('invalid')
        finish(run, { status: 'invalid' })
        return
      }
      setPhase('submitting')
      const reply = await bindings.onSubmit(run.snapshot, context)
      if (!current(run)) return
      if (reply.ok) {
        setPhase('success')
        finish(run, { status: 'success' })
      } else {
        publishErrors(reply.errors)
        setPhase('rejected')
        finish(run, { status: 'rejected' })
      }
    } catch (error) {
      if (!current(run)) return
      setFailure(() => error)
      setPhase('error')
      finish(run, { status: 'error', error })
    }
  }
  return {
    get values() {
      return bindings.values()
    },
    get errors() {
      return errors()
    },
    get failure() {
      return failure()
    },
    get phase() {
      return phase()
    },
    get pending() {
      return phase() === 'validating' || phase() === 'submitting'
    },
    get dirty() {
      return !same(bindings.values(), bindings.defaults())
    },
    setValue(field, value) {
      if (!alive) return
      synchronize()
      bindings.onValuesChange(
        copy({ ...untrack(bindings.values), [field]: value }),
      )
      synchronize()
    },
    reset() {
      if (!alive) return
      cancel()
      bindings.onValuesChange(copy(untrack(bindings.defaults)))
      synchronize()
    },
    cancel() {
      if (alive) cancel()
    },
    submit() {
      if (!alive) return Promise.resolve({ status: 'disposed' })
      synchronize()
      if (active) return active.promise
      let resolve!: Attempt['resolve']
      const promise = new Promise<FormOutcome>((done) => {
        resolve = done
      })
      const run: Attempt = {
        id: ++sequence,
        snapshot: copy(untrack(bindings.values)),
        controller: new AbortController(),
        promise,
        resolve,
      }
      active = run
      setErrors({})
      setFailure(undefined)
      setPhase('validating')
      void execute(run)
      return promise
    },
  }
}

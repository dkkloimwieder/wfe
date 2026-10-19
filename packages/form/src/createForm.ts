import { createEffect, createSignal, onCleanup, untrack } from 'solid-js'
import type {
  FormBindings,
  FormContract,
  FormErrors,
  FormOutcome,
  FormPhase,
  FormShape,
  FormSnapshot,
} from './types'
import {
  copyValues,
  copySnapshot,
  sameValues,
  copyErrors,
  hasErrors,
} from './formValues'
type Attempt<T> = {
  id: number
  snapshot: FormSnapshot<T>
  controller: AbortController
  promise: Promise<FormOutcome>
  resolve: (outcome: FormOutcome) => void
}
/** Create inside a Solid owner. Applications own accepted values and callbacks. */
export function createForm<T extends object & FormShape<T>>(
  bindings: FormBindings<T>,
): FormContract<T> {
  const [phase, setPhase] = createSignal<FormPhase>('idle')
  const [errors, setErrors] = createSignal<FormErrors<T>>({})
  const [failure, setFailure] = createSignal<unknown>(undefined)
  let alive = true
  let sequence = 0
  let active: Attempt<T> | undefined
  let accepted = copyValues(untrack(bindings.values))
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
  function accept(next: Readonly<T>) {
    if (sameValues(next, accepted)) return
    accepted = copyValues(next)
    cancel()
  }
  function synchronize() {
    accept(untrack(bindings.values))
  }
  createEffect(
    () => copyValues(bindings.values()),
    (value) => {
      accept(value)
    },
    { defer: true },
  )
  onCleanup(() => {
    alive = false
    cancel('disposed')
  })
  function current(run: Attempt<T>) {
    if (!alive || active !== run) return false
    synchronize()
    return active === run
  }
  function finish(run: Attempt<T>, outcome: FormOutcome) {
    if (!current(run)) return
    active = undefined
    run.resolve(outcome)
  }
  function publishErrors(value: FormErrors<T>) {
    setErrors(copyErrors(value))
  }
  async function execute(run: Attempt<T>) {
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
      return !sameValues(bindings.values(), bindings.defaults())
    },
    setValue(field, value) {
      if (!alive) return
      synchronize()
      bindings.onValuesChange(
        copyValues<T>({ ...untrack(bindings.values), [field]: value }),
      )
      synchronize()
    },
    reset() {
      if (!alive) return
      cancel()
      bindings.onValuesChange(copyValues(untrack(bindings.defaults)))
      synchronize()
    },
    cancel() {
      if (alive) cancel()
    },
    submit() {
      if (!alive) return Promise.resolve({ status: 'disposed' })
      synchronize()
      if (active) return active.promise
      let resolve!: Attempt<T>['resolve']
      const promise = new Promise<FormOutcome>((done) => {
        resolve = done
      })
      const run: Attempt<T> = {
        id: ++sequence,
        snapshot: copySnapshot(untrack(bindings.values)),
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

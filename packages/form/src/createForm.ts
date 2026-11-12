import {
  createEffect,
  createSignal,
  latest,
  onCleanup,
  onFlush,
  untrack,
} from 'solid-js'
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
  let awaitingValues = false
  let requestRevision = 0
  const requests: Array<() => void> = []
  let queuedSubmission: Attempt<T> | undefined
  function cancelQueued(status: 'cancelled' | 'disposed' = 'cancelled') {
    queuedSubmission?.resolve({ status })
    queuedSubmission?.controller.abort()
    queuedSubmission = undefined
  }
  function drain() {
    if (!alive || awaitingValues) return
    requests.shift()?.()
  }
  function requestValues(request: () => void) {
    requests.push(() => {
      synchronize()
      awaitingValues = true
      const revision = ++requestRevision
      try {
        request()
      } finally {
        onFlush(() => {
          if (!alive || revision !== requestRevision) return
          try {
            synchronize()
            awaitingValues = false
            drain()
          } catch (error) {
            // A queued callback has no synchronous caller left to receive it.
            // Fail its queued submission and leave the form available for retry.
            awaitingValues = false
            requestRevision++
            requests.length = 0
            cancel()
            queuedSubmission?.resolve({ status: 'error', error })
            queuedSubmission?.controller.abort()
            queuedSubmission = undefined
            setFailure(() => error)
            setPhase('error')
          }
        })
      }
    })
    drain()
  }
  let accepted = untrack(() => copyValues(bindings.values()))
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
    // Copy inside latest so store fields, as well as signal values, see accepted
    // application writes from this event. Requests alone never imply acceptance.
    accept(untrack(() => latest(() => copyValues(bindings.values()))))
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
    cancelQueued('disposed')
    requests.length = 0
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
  const contract: FormContract<T> = {
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
      requestValues(() => {
        bindings.onValuesChange(copyValues<T>({ ...accepted, [field]: value }))
      })
    },
    reset() {
      if (!alive) return
      cancel()
      cancelQueued()
      requestValues(() => {
        bindings.onValuesChange(
          untrack(() => latest(() => copyValues(bindings.defaults()))),
        )
      })
    },
    cancel() {
      if (alive) {
        cancel()
        cancelQueued()
      }
    },
    submit() {
      if (!alive) return Promise.resolve({ status: 'disposed' })
      if (queuedSubmission) return queuedSubmission.promise
      synchronize()
      if (active) return active.promise
      let resolve!: Attempt<T>['resolve']
      const promise = new Promise<FormOutcome>((done) => {
        resolve = done
      })
      const run: Attempt<T> = {
        id: ++sequence,
        snapshot: copySnapshot(accepted),
        controller: new AbortController(),
        promise,
        resolve,
      }
      const start = () => {
        if (!alive) return
        synchronize()
        run.snapshot = copySnapshot(accepted)
        active = run
        setErrors({})
        setFailure(undefined)
        setPhase('validating')
        void execute(run)
      }
      if (awaitingValues) {
        queuedSubmission = run
        requests.push(() => {
          if (queuedSubmission === run) {
            start()
            queuedSubmission = undefined
          }
          drain()
        })
      } else start()
      return promise
    },
  }
  return contract
}

import { createSignal, onCleanup, untrack } from 'solid-js'
import { createForm } from '@wfe/form'
import { initialValues } from './values'
import type { ExampleValues } from './values'
import type {
  FormContext,
  FormErrors,
  FormReply,
  MaybePromise,
} from '@wfe/form'

type Stage = 'validation' | 'submission'
export type ResponseMode = 'success' | 'field-error' | 'form-error' | 'failure'
type Request = {
  stage: Stage
  context: FormContext
  snapshot: Readonly<ExampleValues>
}
type Held = { request: Request; complete: () => void }
/** Fake application service. Tests can finish even a cancelled response. */
export function createApplication() {
  const [values, setValues] = createSignal(initialValues)
  const [defaults, setDefaults] = createSignal(initialValues)
  const [response, setResponse] = createSignal<ResponseMode>('success')
  const [hold, setHold] = createSignal<Stage | undefined>(undefined)
  const [rejectEdits, setRejectEdits] = createSignal(false)
  const [waiting, setWaiting] = createSignal(0)
  const lifecycle = { changes: 0, reads: 0, cleanups: 0 }
  let alive = true
  const requests: Request[] = []
  const held: Held[] = []
  const errors = (
    snapshot: Readonly<ExampleValues>,
  ): FormErrors<ExampleValues> => ({
    fields: {
      name: snapshot.name.trim() ? undefined : 'Enter a name.',
      category: ['General', 'Research'].includes(snapshot.category)
        ? undefined
        : 'Choose an available category.',
    },
  })
  function respond<T>(request: Request, value: () => T): MaybePromise<T> {
    requests.push(request)
    if (untrack(hold) !== request.stage) return value()
    return new Promise<T>((resolve, reject) => {
      held.push({
        request,
        complete() {
          try {
            resolve(value())
          } catch (error) {
            reject(error)
          }
        },
      })
      setWaiting(held.length)
    })
  }
  const form = createForm<ExampleValues>({
    values: () => {
      lifecycle.reads++
      return values()
    },
    defaults,
    onValuesChange(next) {
      lifecycle.changes++
      if (!untrack(rejectEdits)) setValues(next)
    },
    validate(snapshot, context) {
      return respond({ stage: 'validation', snapshot, context }, () =>
        errors(snapshot),
      )
    },
    onSubmit(snapshot, context) {
      const mode = untrack(response)
      return respond<FormReply<ExampleValues>>(
        { stage: 'submission', snapshot, context },
        () => {
          if (mode === 'failure') throw new Error('Simulated service failure')
          if (mode === 'field-error')
            return {
              ok: false,
              errors: { fields: { name: 'This name is already in use.' } },
            }
          if (mode === 'form-error')
            return {
              ok: false,
              errors: { form: 'The service rejected this record.' },
            }
          if (alive && !context.signal.aborted) setDefaults(snapshot)
          return { ok: true }
        },
      )
    },
  })
  onCleanup(() => {
    lifecycle.cleanups++
    alive = false
  })
  return {
    form,
    lifecycle,
    response,
    hold,
    rejectEdits,
    waiting,
    setResponse,
    setHold,
    setRejectEdits,
    replace(next: Readonly<ExampleValues>) {
      if (alive) {
        setDefaults(Object.freeze({ ...next }))
        setValues(Object.freeze({ ...next }))
      }
    },
    complete(attempt?: number, stage?: Stage) {
      const index = held.findIndex(
        (item) =>
          (attempt === undefined || item.request.context.attempt === attempt) &&
          (stage === undefined || item.request.stage === stage),
      )
      if (index < 0) return false
      held.splice(index, 1)[0]!.complete()
      if (alive) setWaiting(held.length)
      return true
    },
    snapshot() {
      return {
        values: { ...untrack(values) },
        defaults: { ...untrack(defaults) },
        phase: untrack(() => form.phase),
        dirty: untrack(() => form.dirty),
        errors: untrack(() => form.errors),
        waiting: held.length,
        requests: requests.map((item) => ({
          stage: item.stage,
          attempt: item.context.attempt,
          aborted: item.context.signal.aborted,
          snapshot: { ...item.snapshot },
        })),
      }
    },
  }
}

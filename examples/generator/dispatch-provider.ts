import { createSignal, onCleanup } from 'solid-js'
import type { FormContext, FormErrors, FormReply } from '@wfe/form'

export type DispatchValues = {
  trackingCode: string
  carrier: 'post' | 'courier'
  insured: boolean
  declaredValue: number | null
  dispatchDate: string
}
export type DispatchRow = {
  tracking: string
  carrier: 'post' | 'courier'
  status: 'queued' | 'sent'
  feeCents: number
  scheduledAt: string
}
export const initialDispatch: DispatchValues = {
  trackingCode: 'PKG-100',
  carrier: 'post',
  insured: false,
  declaredValue: null,
  dispatchDate: '2026-10-17',
}
export type DispatchStage = 'validation' | 'save'
export type DispatchResponse =
  'accepted' | 'field-error' | 'form-error' | 'failure'
type RequestBase = {
  id: number
  values: Readonly<DispatchValues>
  signal: AbortSignal
  settled: boolean
}
type Request = RequestBase &
  (
    | {
        stage: 'validation'
        resolve: (reply: FormErrors<DispatchValues>) => void
      }
    | { stage: 'save'; resolve: (reply: FormReply<DispatchValues>) => void }
  )

export function createDispatchProvider() {
  const [rows, setRows] = createSignal<Readonly<Record<string, DispatchRow>>>({
    first: {
      tracking: 'PKG-100',
      carrier: 'post',
      status: 'queued',
      feeCents: 725,
      scheduledAt: '2026-10-17',
    },
    second: {
      tracking: 'BOX-210',
      carrier: 'courier',
      status: 'sent',
      feeCents: 1900,
      scheduledAt: '2026-10-16',
    },
  })
  const [requests, setRequests] = createSignal<readonly Request[]>([])
  const [hold, setHold] = createSignal<DispatchStage | undefined>()
  const [response, setResponse] = createSignal<DispatchResponse>('accepted')
  const [publications, setPublications] = createSignal(0)
  let nextId = 0
  let alive = true
  onCleanup(() => {
    alive = false
  })
  function rules(values: Readonly<DispatchValues>): FormErrors<DispatchValues> {
    if (!/^PKG-\d+$/.test(values.trackingCode))
      return {
        fields: { trackingCode: 'Use PKG followed by a hyphen and digits' },
      }
    if (
      values.declaredValue !== null &&
      (!Number.isFinite(values.declaredValue) || values.declaredValue < 0)
    )
      return { fields: { declaredValue: 'Use a finite nonnegative value' } }
    if (
      values.insured &&
      (values.declaredValue === null || values.declaredValue <= 0)
    )
      return { fields: { declaredValue: 'Enter a positive insured value' } }
    const date = Date.parse(`${values.dispatchDate}T00:00:00Z`)
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(values.dispatchDate) ||
      !Number.isFinite(date) ||
      new Date(date).toISOString().slice(0, 10) !== values.dispatchDate
    )
      return { fields: { dispatchDate: 'Use YYYY-MM-DD' } }
    return {}
  }
  function base(
    values: Readonly<DispatchValues>,
    context: FormContext,
  ): RequestBase {
    return {
      id: ++nextId,
      values: Object.freeze({ ...values }),
      signal: context.signal,
      settled: false,
    }
  }
  function completeValidation(id: number, errors?: FormErrors<DispatchValues>) {
    const entry = requests().find((candidate) => candidate.id === id)
    if (!entry || entry.stage !== 'validation' || entry.settled) return false
    entry.settled = true
    entry.resolve(errors ?? rules(entry.values))
    if (alive) setRequests((old) => [...old])
    return true
  }
  function completeSave(
    id: number,
    reply: FormReply<DispatchValues> = { ok: true },
  ) {
    const entry = requests().find((candidate) => candidate.id === id)
    if (!entry || entry.stage !== 'save' || entry.settled) return false
    entry.settled = true
    entry.resolve(reply)
    if (alive) setRequests((old) => [...old])
    return true
  }
  function pending() {
    const entries = requests()
    for (let index = entries.length - 1; index >= 0; index--) {
      const entry = entries[index]!
      if (!entry.settled && !entry.signal.aborted) return entry
    }
    return undefined
  }
  return {
    rows,
    publications,
    hold,
    setHold,
    response,
    setResponse,
    rules,
    completeValidation,
    completeSave,
    pending,
    async validate(
      values: Readonly<DispatchValues>,
      context: FormContext,
    ): Promise<FormErrors<DispatchValues>> {
      if (!alive || context.signal.aborted) return {}
      if (hold() === 'validation')
        return await new Promise<FormErrors<DispatchValues>>((resolve) =>
          setRequests((old) => [
            ...old,
            { ...base(values, context), stage: 'validation', resolve },
          ]),
        )
      return rules(values)
    },
    async save(
      values: Readonly<DispatchValues>,
      context: FormContext,
    ): Promise<FormReply<DispatchValues>> {
      if (!alive || context.signal.aborted) return { ok: true }
      const outcome = response()
      let reply: FormReply<DispatchValues>
      if (hold() === 'save')
        reply = await new Promise<FormReply<DispatchValues>>((resolve) =>
          setRequests((old) => [
            ...old,
            { ...base(values, context), stage: 'save', resolve },
          ]),
        )
      else {
        await Promise.resolve()
        if (outcome === 'failure')
          throw new Error('Dispatch service is unavailable')
        reply =
          outcome === 'field-error'
            ? {
                ok: false,
                errors: {
                  fields: { trackingCode: 'Tracking code is already assigned' },
                },
              }
            : outcome === 'form-error'
              ? {
                  ok: false,
                  errors: { form: 'Dispatch is closed for this date' },
                }
              : { ok: true }
      }
      if (alive && !context.signal.aborted && reply.ok) {
        setRows((old) => ({
          ...old,
          [`saved-${context.attempt}`]: {
            tracking: values.trackingCode,
            carrier: values.carrier,
            status: 'queued',
            feeCents: values.carrier === 'post' ? 725 : 1900,
            scheduledAt: values.dispatchDate,
          },
        }))
        setPublications((old) => old + 1)
      }
      return reply
    },
    snapshot: () => ({
      rows: Object.values(rows()),
      publications: publications(),
      requests: requests().map(({ id, stage, values, signal, settled }) => ({
        id,
        stage,
        values,
        aborted: signal.aborted,
        settled,
      })),
    }),
  }
}

import { createSignal, onCleanup } from 'solid-js'
import type { FormContext, FormErrors, FormReply } from '@wfe/form'

export type RecordValues = {
  name: string
  active: boolean
  alerts: boolean
  category: 'a' | 'b'
  notes: string
  quantity?: number
}
export const initialRecord: RecordValues = {
  name: 'Sample record',
  active: true,
  alerts: false,
  category: 'a',
  notes: 'A note',
}

export function createRecordsProvider() {
  let alive = true
  onCleanup(() => {
    alive = false
  })
  const [row, setRow] = createSignal({ name: initialRecord.name, quantity: 2 })
  const [count, setCount] = createSignal(1)
  const [submitted, setSubmitted] = createSignal(0)
  return {
    row,
    setRow,
    setCount,
    submitted,
    ids: () => Array.from({ length: count() }, (_, index) => `record-${index}`),
    validate(snapshot: Readonly<RecordValues>): FormErrors<RecordValues> {
      if (!snapshot.name)
        return {
          fields: {
            name: 'Name is required',
            active: 'Review active flag',
            alerts: 'Review alerts flag',
          },
        }
      if (
        snapshot.quantity !== undefined &&
        (!Number.isFinite(snapshot.quantity) || snapshot.quantity < 0)
      )
        return { fields: { quantity: 'Use a nonnegative quantity' } }
      return {}
    },
    async save(
      snapshot: Readonly<RecordValues>,
      context: FormContext,
    ): Promise<FormReply<RecordValues>> {
      await Promise.resolve()
      if (alive && !context.signal.aborted) {
        setRow({ name: snapshot.name, quantity: snapshot.quantity ?? 0 })
        setSubmitted((old) => old + 1)
      }
      return { ok: true }
    },
  }
}

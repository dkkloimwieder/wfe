import type { Outcome, Transport } from './snapshot/runtime/wire'
const uncertain = (reason: string): Outcome<never> => ({
  status: 'uncertain',
  reason,
  retryRefusal: null,
})

export function createCheckedOperation(transport: Transport) {
  async function call<T>(
    invoke: (checked: Transport) => Promise<Outcome<unknown>>,
    schema: {
      safeParse: (
        value: unknown,
      ) => { success: true; data: T } | { success: false }
    },
    signal?: AbortSignal,
  ): Promise<Outcome<T>> {
    if (signal?.aborted)
      return uncertain('The application stopped waiting for this request.')
    let abort: (() => void) | undefined
    const stopped = new Promise<Outcome<T>>((resolve) => {
      abort = () =>
        resolve(
          uncertain(
            'The application stopped waiting. The operation can still complete.',
          ),
        )
      signal?.addEventListener('abort', abort, { once: true })
    })
    const operation = (async () => {
      try {
        const outcome = await invoke(transport)
        if (outcome.status === 'completed') {
          const parsed = schema.safeParse(outcome.value)
          if (!parsed.success)
            return uncertain('The reply does not match the operation result.')
          return { ...outcome, value: parsed.data }
        } else if (outcome.status === 'partiallyCompleted') {
          return uncertain('This screen cannot apply a partial reply.')
        }
        return outcome
      } catch {
        return uncertain('The request did not establish completion.')
      }
    })()
    try {
      return await Promise.race([operation, stopped])
    } finally {
      if (abort) signal?.removeEventListener('abort', abort)
    }
  }
  return call
}

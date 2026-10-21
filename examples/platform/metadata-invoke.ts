import type { Transport } from './snapshot/runtime/wire'

export type ResultValidator = {
  safeParse: (value: unknown) => { success: boolean }
}

/** Validate one completed wire result before a generated client renames it. */
export function createMetadataInvoke(
  source: Pick<Transport, 'invoke'>,
  schemas: ReadonlyMap<string, ResultValidator>,
): Pick<Transport, 'invoke'> {
  return {
    async invoke(request) {
      const schema = schemas.get(request.operation)
      if (!schema || request.contract.resultClass !== 'one')
        return {
          status: 'uncertain',
          reason: 'No captured result validator supports this operation.',
          retryRefusal: null,
        }
      const outcome = await source.invoke(request)
      if (
        outcome.status === 'completed' &&
        !schema.safeParse(outcome.value).success
      )
        return {
          status: 'uncertain',
          reason: 'The reply does not match the operation result.',
          retryRefusal: null,
        }
      return outcome
    },
  }
}

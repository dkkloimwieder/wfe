import { createSignal, onCleanup } from 'solid-js'
import { createForm } from '@wfe/form'
import type { Authority, PlatformUser, createPlatformClient } from './provider'
import { accessFailure } from './access-application'
export type LifecycleCommand = 'activate' | 'deactivate'
type Values = { principalId: string; command: LifecycleCommand }
/** A confirmation example over sample records, not an account lifecycle policy. */
export function createLifecycleApplication(
  client: ReturnType<typeof createPlatformClient>,
  authority: () => Authority | undefined,
  users: () => readonly PlatformUser[],
  refresh: () => Promise<void>,
) {
  const empty = (): Values => ({ principalId: '', command: 'activate' })
  const [values, setValues] = createSignal<Values>(empty())
  const [target, setTarget] = createSignal<{
    principalId: string
    name: string
    command: LifecycleCommand
  }>()
  let alive = true
  const form = createForm<Values>({
    values,
    defaults: empty,
    onValuesChange: setValues,
    validate: () => ({}),
    async onSubmit(snapshot, context) {
      const selected = target()
      if (
        !selected ||
        selected.principalId !== snapshot.principalId ||
        selected.command !== snapshot.command ||
        !users().some((row) => row.principalId === selected.principalId) ||
        !authority()?.orgAdmin
      )
        return {
          ok: false,
          errors: { form: 'This sample action is no longer available.' },
        }
      const outcome = await client.lifecycle(
        snapshot.command,
        snapshot.principalId,
        crypto.randomUUID(),
        context.signal,
      )
      if (!alive || context.signal.aborted)
        return {
          ok: false,
          errors: { form: 'The demo stopped waiting for this response.' },
        }
      if (outcome.status !== 'completed')
        return { ok: false, errors: { form: accessFailure(outcome) } }
      await refresh()
      if (alive && !context.signal.aborted) setTarget(undefined)
      return { ok: true }
    },
  })
  function close() {
    form.cancel()
    setTarget(undefined)
  }
  function open(user: PlatformUser, command: LifecycleCommand) {
    if (!alive) return
    form.reset()
    setValues({ principalId: user.principalId, command })
    setTarget({
      principalId: user.principalId,
      name: user.displayName,
      command,
    })
  }
  onCleanup(() => {
    alive = false
  })
  return { form, target, open, close }
}

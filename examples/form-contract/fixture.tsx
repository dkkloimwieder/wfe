import { render, hydrate } from '@solidjs/web'
import { OBSERVE, action, flush } from 'solid-js'
import { App } from './App'
import type { createApplication } from './application'
import './style.css'
export function createFixture() {
  let release: (() => void) | undefined
  let application: ReturnType<typeof createApplication> | undefined
  let capture:
    | ReturnType<NonNullable<typeof OBSERVE>['diagnostics']['capture']>
    | undefined
  const events: unknown[] = []
  // eslint-disable-next-line require-yield -- Preserve the qualified synchronous disposal path.
  const disposeRoot = action(function* () {
    release?.()
  })
  function stop() {
    disposeRoot()
    flush()
    release = undefined
    application = undefined
    document.getElementById('root')!.replaceChildren()
  }
  function start() {
    stop()
    events.push(...(capture?.stop() ?? []))
    capture = OBSERVE?.diagnostics.capture()
    release = render(
      () => (
        <App
          ready={(value) => {
            application = value
          }}
        />
      ),
      document.getElementById('root')!,
    )
    flush()
  }
  const api = {
    start,
    stop,
    hydrate: async () => {
      events.push(...(capture?.stop() ?? []))
      capture = OBSERVE?.diagnostics.capture()
      release = await hydrate(
        () => (
          <App
            ready={(value) => {
              application = value
            }}
          />
        ),
        document.getElementById('root')!,
      )
      flush()
    },
    snapshot: () => application?.snapshot(),
    capture: () => application,
    hold: (stage: 'validation' | 'submission' | undefined) => {
      application?.setHold(stage)
      flush()
    },
    rejectEdits: (value: boolean) => {
      application?.setRejectEdits(value)
      flush()
    },
    complete: (attempt?: number, stage?: 'validation' | 'submission') => {
      const result = application?.complete(attempt, stage)
      flush()
      return result
    },
    submit: () => application?.form.submit(),
    replace: (value: { name: string; category: string; enabled: boolean }) => {
      application?.replace(value)
      flush()
    },
    diagnostics: () => {
      events.push(...(capture?.stop() ?? []))
      return events.splice(0)
    },
  }

  return api
}
declare global {
  interface Window {
    formContractFixture: ReturnType<typeof createFixture>
  }
}

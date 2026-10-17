import { OBSERVE, action, flush } from 'solid-js'
import { hydrate, render } from '@solidjs/web'
import type { FormOutcome } from '@wfe/form'
import { App } from './App'
import type { createApplication } from './application'
import './style.css'
export function createFixture(name: string = 'original') {
  let capture:
    | ReturnType<NonNullable<typeof OBSERVE>['diagnostics']['capture']>
    | undefined
  const events: unknown[] = []
  const begin = () => {
    events.push(...(capture?.stop() ?? []))
    capture = OBSERVE?.diagnostics.capture()
  }
  let release: (() => void) | undefined
  let app: ReturnType<typeof createApplication> | undefined
  let outcome: FormOutcome | undefined
  // eslint-disable-next-line require-yield -- Disposal uses the existing synchronous action boundary.
  const dispose = action(function* () {
    release?.()
  })
  return {
    start() {
      begin()
      release = render(
        () => (
          <App
            name={name}
            ready={(value: ReturnType<typeof createApplication>) => {
              app = value
            }}
          />
        ),
        document.getElementById('root')!,
      )
      flush()
    },
    async hydrate() {
      begin()
      release = await hydrate(
        () => (
          <App
            name={name}
            ready={(value: ReturnType<typeof createApplication>) => {
              app = value
            }}
          />
        ),
        document.getElementById('root')!,
      )
      flush()
    },
    submit() {
      outcome = undefined
      void app!.form.submit().then((result) => {
        outcome = result
      })
      flush()
    },
    outcome: () => outcome,
    variant(value: string) {
      app!.setVariant(value)
      flush()
    },
    fault(
      path: string,
      value: Parameters<
        ReturnType<typeof createApplication>['server']['fault']
      >[1],
    ) {
      app!.server.fault(path, value)
    },
    release() {
      app!.server.release()
      flush()
    },
    cancel() {
      app!.form.cancel()
      flush()
    },
    snapshot: () => app!.snapshot(),
    diagnostics: () => {
      events.push(...(capture?.stop() ?? []))
      capture = undefined
      return events.splice(0)
    },
    stop() {
      dispose()
      flush()
      release = undefined
    },
  }
}
declare global {
  interface Window {
    generatorFixture: ReturnType<typeof createFixture>
  }
}

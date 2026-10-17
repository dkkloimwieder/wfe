import { OBSERVE, action, flush } from 'solid-js'
import { hydrate, render } from '@solidjs/web'
import { App } from './App'
import './style.css'
export function createFixture() {
  let capture:
    | ReturnType<NonNullable<typeof OBSERVE>['diagnostics']['capture']>
    | undefined
  const events: unknown[] = []
  const begin = () => {
    events.push(...(capture?.stop() ?? []))
    capture = OBSERVE?.diagnostics.capture()
  }
  let release: (() => void) | undefined
  let app:
    Parameters<NonNullable<Parameters<typeof App>[0]['ready']>>[0] | undefined
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
            ready={(value) => {
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
            ready={(value) => {
              app = value
            }}
          />
        ),
        document.getElementById('root')!,
      )
      flush()
    },
    fill(value: boolean) {
      app!.setFill(value)
      flush()
    },
    rows(count: number) {
      app!.setCount(count)
      flush()
    },
    columns(count: 1 | 2) {
      app!.setColumns(count)
      flush()
    },
    revise() {
      app!.revise()
      flush()
    },
    remove() {
      app!.remove()
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

import { render, hydrate } from '@solidjs/web'
import { action, flush } from 'solid-js'
import { App } from './App'
import type { ShellFixture } from './App'
const target = document.getElementById('root')!
let app: ShellFixture
const dispose = (target.dataset.ssr === 'true' ? hydrate : render)(
  () => (
    <App
      initialUrl={location.href}
      ready={(value) => {
        app = value
      }}
    />
  ),
  target,
)
if (new URLSearchParams(location.search).has('qualification')) {
  // eslint-disable-next-line require-yield -- The fixture exposes synchronous owned disposal.
  const stop = action(function* () {
    dispose()
  })
  window.shellFixture = {
    ...app!,
    stop: () => {
      stop()
      flush()
    },
  }
}
declare global {
  interface Window {
    shellFixture: ShellFixture & { stop: () => void }
  }
}

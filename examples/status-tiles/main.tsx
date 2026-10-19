import { render, hydrate } from '@solidjs/web'
import { action, flush } from 'solid-js'
import { App } from './App'
import type { TileFixture } from './App'
const target = document.getElementById('root')!
let app: TileFixture
const dispose = (target.dataset.ssr === 'true' ? hydrate : render)(
  () => (
    <App
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
  window.tileFixture = {
    ...app!,
    stop: () => {
      stop()
      flush()
    },
  }
}
declare global {
  interface Window {
    tileFixture: TileFixture & { stop: () => void }
  }
}

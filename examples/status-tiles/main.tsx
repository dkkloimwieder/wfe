import { createFixtureDisposal } from '../shared/fixtureDisposal'
import { render, hydrate } from '@solidjs/web'
import { flush } from 'solid-js'
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
  const stop = createFixtureDisposal(() => {
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

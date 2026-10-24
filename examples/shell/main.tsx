import { createFixtureDisposal } from '../shared/fixtureDisposal'
import { render, hydrate } from '@solidjs/web'
import { flush } from 'solid-js'
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
  const stop = createFixtureDisposal(() => {
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

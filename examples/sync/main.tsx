import { createFixtureDisposal } from '../shared/fixtureDisposal'
import { render } from '@solidjs/web'
import { flush } from 'solid-js'
import { App } from './App'
const dispose = render(() => <App />, document.getElementById('root')!)
if (new URLSearchParams(location.search).has('qualification')) {
  const stop = createFixtureDisposal(() => {
    dispose()
  })
  window.syncFixture = {
    stop: () => {
      stop()
      flush()
    },
  }
}
declare global {
  interface Window {
    syncFixture: { stop: () => void }
  }
}

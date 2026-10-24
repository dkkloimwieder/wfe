import { render } from '@solidjs/web'
import { action, flush } from 'solid-js'
import { App } from './App'
const dispose = render(() => <App />, document.getElementById('root')!)
if (new URLSearchParams(location.search).has('qualification')) {
  // eslint-disable-next-line require-yield -- The fixture exposes synchronous owned disposal.
  const stop = action(function* () {
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

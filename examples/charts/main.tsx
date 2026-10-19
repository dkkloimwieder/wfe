import { render, hydrate } from '@solidjs/web'
import { action, flush } from 'solid-js'
import { App } from './App'
import type { ChartFixture } from './App'
let app: ChartFixture
const target = document.getElementById('root')!
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
// eslint-disable-next-line require-yield -- The fixture exposes synchronous owned disposal.
const stop = action(function* () {
  dispose()
})
window.chartFixture = {
  context: () => app.context(),
  stop: () => {
    stop()
    flush()
  },
}
declare global {
  interface Window {
    chartFixture: ChartFixture & { stop: () => void }
  }
}

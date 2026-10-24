import { createFixtureDisposal } from '../shared/fixtureDisposal'
import { render, hydrate } from '@solidjs/web'
import { flush } from 'solid-js'
import { App } from './App'
import type { ChartFixture } from './App'
let app: ChartFixture
const target = document.getElementById('root')!
const dispose = (target.dataset.ssr === 'true' ? hydrate : render)(
  () => (
    <App
      standalone={new URLSearchParams(location.search).has('standalone')}
      hidden={new URLSearchParams(location.search).has('hidden')}
      ready={(value) => {
        app = value
      }}
    />
  ),
  target,
)
const stop = createFixtureDisposal(() => {
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

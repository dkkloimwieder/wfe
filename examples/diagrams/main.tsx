import { render, hydrate } from '@solidjs/web'
import { flush } from 'solid-js'
import { createFixtureDisposal } from '../shared/fixtureDisposal'
import { App } from './App'
const target = document.getElementById('root')!
const dispose = (target.dataset.ssr === 'true' ? hydrate : render)(
  () => <App />,
  target,
)
const stop = createFixtureDisposal(dispose)
window.stopDiagramFixture = () => {
  stop()
  flush()
}
declare global {
  interface Window {
    stopDiagramFixture: () => void
  }
}

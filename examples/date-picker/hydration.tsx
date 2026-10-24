import { createFixtureDisposal } from '../shared/fixtureDisposal'
import { hydrate } from '@solidjs/web'
import { flush, OBSERVE } from 'solid-js'
import { HydrationApp } from './HydrationApp'
import '@wfe/components/styles.css'
const capture = OBSERVE?.diagnostics.capture()
let snapshot!: () => unknown
const release = await hydrate(
  () => (
    <HydrationApp
      ready={(next) => {
        snapshot = next
      }}
    />
  ),
  document.getElementById('root')!,
)
flush()
const dispose = createFixtureDisposal(() => {
  release()
})
const api = {
  snapshot: () => snapshot(),
  diagnostics: () => capture?.stop() ?? [],
  stop() {
    dispose()
    flush()
  },
}
declare global {
  interface Window {
    dateHydration: typeof api
  }
}
window.dateHydration = api
document.documentElement.dataset.hydrated = 'true'

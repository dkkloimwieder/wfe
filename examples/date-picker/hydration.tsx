import { hydrate } from '@solidjs/web'
import { action, flush, OBSERVE } from 'solid-js'
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
// eslint-disable-next-line require-yield -- Disposal uses the established synchronous action boundary.
const dispose = action(function* () {
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

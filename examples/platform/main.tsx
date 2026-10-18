import { render, hydrate } from '@solidjs/web'
import { action, flush } from 'solid-js'
import { PlatformApp } from './PlatformApp'
import type { createPlatformApplication } from './application'
let app: ReturnType<typeof createPlatformApplication>
const mount =
  document.getElementById('root')!.dataset.ssr === 'true' ? hydrate : render
const dispose = mount(
  () => (
    <PlatformApp
      initialUrl={location.href}
      ready={(value) => {
        app = value
      }}
    />
  ),
  document.getElementById('root')!,
)
// eslint-disable-next-line require-yield -- Keep the qualified synchronous disposal boundary.
const cleanup = action(function* () {
  dispose()
})
window.platformFixture = {
  app: () => app,
  stop: () => {
    cleanup()
    flush()
  },
}
declare global {
  interface Window {
    platformFixture: {
      app: () => ReturnType<typeof createPlatformApplication>
      stop: () => void
    }
  }
}

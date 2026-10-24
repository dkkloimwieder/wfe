import { createFixtureDisposal } from '../shared/fixtureDisposal'
import { classLifecycle } from '../shared/controls/StructuredClasses'
import { hydrate } from '@solidjs/web'
import { OBSERVE, flush } from 'solid-js'
import App, { lifecycle } from './App'

const capture = OBSERVE?.diagnostics.capture()
const release = await hydrate(() => <App />, document.getElementById('app')!)
// Match the rc.13 root disposal workaround in the editing fixture.
const disposeRoot = createFixtureDisposal(() => {
  release()
})
Object.assign(window, {
  hydrationFixture: {
    dispose: () => {
      disposeRoot()
      flush()
      // hydrate releases scopes and listeners, leaving server DOM to its host.
      document.getElementById('app')!.replaceChildren()
    },
    configure: (value: Parameters<typeof lifecycle.configure>[0]) => {
      lifecycle.configure(value)
      flush()
    },
    lifecycle,
    classes: classLifecycle,
    diagnostics: () => capture?.stop() ?? [],
  },
})
document.documentElement.dataset.hydrated = 'true'

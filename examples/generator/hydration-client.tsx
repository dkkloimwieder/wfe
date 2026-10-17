import { createFixture } from './fixture'
import { applicationName } from './applications'
window.generatorFixture = createFixture(
  applicationName(new URLSearchParams(location.search).get('app')),
)
await window.generatorFixture.hydrate()
document.documentElement.dataset.hydrated = 'true'

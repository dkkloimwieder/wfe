import { createFixture } from './fixture'
window.generatorFixture = createFixture(
  new URLSearchParams(location.search).get('app') ?? 'original',
)
window.generatorFixture.hydrate()
document.documentElement.dataset.hydrated = 'true'

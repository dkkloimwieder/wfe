import { createFixture } from './fixture'
window.generatorFixture = createFixture()
await window.generatorFixture.hydrate()
document.documentElement.dataset.hydrated = 'true'

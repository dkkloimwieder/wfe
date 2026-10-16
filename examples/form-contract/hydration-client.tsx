import { createFixture } from './fixture'
window.formContractFixture = createFixture()
await window.formContractFixture.hydrate()
document.documentElement.dataset.hydrated = 'true'

import { HydrationApp } from './AssociationCases'
import { createFixture } from './fixture'
window.formContractFixture = createFixture(HydrationApp)
await window.formContractFixture.hydrate()
document.documentElement.dataset.hydrated = 'true'

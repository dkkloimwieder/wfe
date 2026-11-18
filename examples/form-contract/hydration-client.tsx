import { HydrationApp } from './AssociationCases'
import { createFixture } from './fixture'
window.formContractFixture = createFixture(HydrationApp)
window.formContractFixture.hydrate()
document.documentElement.dataset.hydrated = 'true'

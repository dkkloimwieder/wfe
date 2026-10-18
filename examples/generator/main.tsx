import { createFixture } from './fixture'
import { applicationName } from './applications'
window.generatorFixture = createFixture(
  applicationName(new URLSearchParams(location.search).get('app')),
  new URLSearchParams(location.search).get('reviewCells') === '1',
)
window.generatorFixture.start()

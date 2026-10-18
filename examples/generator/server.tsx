import { generateHydrationScript, renderToString } from '@solidjs/web'
import { applications, applicationName } from './applications'
import { ExampleAppearance } from './ExampleAppearance'
import { recordRoute } from './record-route'
export async function render(
  name: string = 'records',
  reviewCells = false,
  initialUrl = '?app=records',
) {
  const App = applications[applicationName(name)]
  return {
    html:
      generateHydrationScript() +
      (await renderToString(() => (
        <ExampleAppearance>
          <App
            reviewCells={reviewCells}
            initialRoute={recordRoute(initialUrl)}
          />
        </ExampleAppearance>
      ))),
  }
}

import { generateHydrationScript, renderToString } from '@solidjs/web'
import { applications, applicationName } from './applications'
import { ExampleAppearance } from './ExampleAppearance'
import { recordRoute } from './record-route'
export function render(
  name: string = 'records',
  reviewCells = false,
  initialUrl = '?app=records',
) {
  const App = applications[applicationName(name)]
  return {
    html:
      generateHydrationScript() +
      renderToString(() => (
        <ExampleAppearance>
          <App
            reviewCells={reviewCells}
            initialRoute={recordRoute(initialUrl)}
            initialUrl={initialUrl}
          />
        </ExampleAppearance>
      )),
  }
}

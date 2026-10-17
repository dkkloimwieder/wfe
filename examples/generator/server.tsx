import { generateHydrationScript, renderToString } from '@solidjs/web'
import { applications, applicationName } from './applications'
export async function render(name: string = 'records') {
  const App = applications[applicationName(name)]
  return {
    html: generateHydrationScript() + (await renderToString(() => <App />)),
  }
}

import { generateHydrationScript, renderToString } from '@solidjs/web'
import { App } from './App'
export async function render() {
  return generateHydrationScript() + (await renderToString(() => <App />))
}

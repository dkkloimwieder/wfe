import { generateHydrationScript, renderToString } from '@solidjs/web'
import { App } from './App'
export function render() {
  return generateHydrationScript() + renderToString(() => <App />)
}

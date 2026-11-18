import { generateHydrationScript, renderToString } from '@solidjs/web'
import { App } from './App'
export function render(name: string = 'original') {
  return {
    html: generateHydrationScript() + renderToString(() => <App name={name} />),
  }
}

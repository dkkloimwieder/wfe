import { generateHydrationScript, renderToString } from '@solidjs/web'
import { App } from './App'
export async function render(name: string = 'original') {
  return {
    html:
      generateHydrationScript() +
      (await renderToString(() => <App name={name} />)),
  }
}

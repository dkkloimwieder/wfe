import { generateHydrationScript, renderToString } from '@solidjs/web'
import { App } from './App'
export async function render(url = '/') {
  return (
    generateHydrationScript() +
    (await renderToString(() => <App initialUrl={url} />))
  )
}

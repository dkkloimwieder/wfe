import { generateHydrationScript, renderToString } from '@solidjs/web'
import { App } from './App'
export function render(url = '/') {
  return (
    generateHydrationScript() + renderToString(() => <App initialUrl={url} />)
  )
}

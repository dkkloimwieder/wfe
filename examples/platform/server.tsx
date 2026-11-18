import { generateHydrationScript, renderToString } from '@solidjs/web'
import { PlatformApp } from './PlatformApp'
/** Initial server markup defers transport calls until browser attachment. */
export function render(url = '/') {
  return (
    generateHydrationScript() +
    renderToString(() => <PlatformApp initialUrl={url} />)
  )
}

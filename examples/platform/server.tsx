import { generateHydrationScript, renderToString } from '@solidjs/web'
import { PlatformApp } from './PlatformApp'
/** Initial server markup defers transport calls until browser attachment. */
export async function render(url = '/') {
  return (
    generateHydrationScript() +
    (await renderToString(() => <PlatformApp initialUrl={url} />))
  )
}

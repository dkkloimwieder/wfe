import { generateHydrationScript, renderToString } from '@solidjs/web'
import { HydrationApp } from './HydrationApp'
export async function render() {
  return (
    generateHydrationScript() + (await renderToString(() => <HydrationApp />))
  )
}

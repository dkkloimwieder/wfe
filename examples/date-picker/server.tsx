import { generateHydrationScript, renderToString } from '@solidjs/web'
import { HydrationApp } from './HydrationApp'
export function render() {
  return generateHydrationScript() + renderToString(() => <HydrationApp />)
}

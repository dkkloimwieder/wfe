import { HydrationApp } from './AssociationCases'
import { generateHydrationScript, renderToString } from '@solidjs/web'
import type { createApplication } from './application'
export function render() {
  let application: ReturnType<typeof createApplication> | undefined
  const markup = renderToString(() => (
    <HydrationApp
      ready={(value) => {
        application = value
      }}
    />
  ))
  return {
    html: generateHydrationScript() + markup,
    snapshot: application!.snapshot(),
  }
}

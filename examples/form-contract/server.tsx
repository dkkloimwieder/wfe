import { generateHydrationScript, renderToString } from '@solidjs/web'
import { App } from './App'
import type { createApplication } from './application'
export async function render() {
  let application: ReturnType<typeof createApplication> | undefined
  const markup = await renderToString(() => (
    <App
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

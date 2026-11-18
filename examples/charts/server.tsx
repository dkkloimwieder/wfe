import { generateHydrationScript, renderToString } from '@solidjs/web'
import { App } from './App'
export function render(url = '/') {
  return (
    generateHydrationScript() +
    renderToString(() => (
      <App
        hidden={new URL(url, 'http://chart.example').searchParams.has('hidden')}
        standalone={new URL(url, 'http://chart.example').searchParams.has(
          'standalone',
        )}
      />
    ))
  )
}

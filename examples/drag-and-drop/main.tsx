import { render } from '@solidjs/web'
import { Theme } from '@wfe/components/theme'
import { BoardExample } from '../shared/drag-and-drop/BoardExample'
import '@wfe/components/styles.css'
import { createFixtureDisposal } from '../shared/fixtureDisposal'
let release: (() => void) | undefined
const stop = createFixtureDisposal(() => {
  release?.()
  release = undefined
})
release = render(
  () => (
    <Theme
      mode={
        new URLSearchParams(location.search).get('theme') === 'dark'
          ? 'dark'
          : 'light'
      }
      style={{ height: '100dvh' }}
    >
      <BoardExample />
    </Theme>
  ),
  document.getElementById('root')!,
)
window.addEventListener('pagehide', stop, { once: true })

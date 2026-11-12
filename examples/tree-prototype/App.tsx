import { createSignal, For } from 'solid-js'
import { Theme } from '@wfe/components/theme'
import { Button } from '@wfe/components'
import { TreeExample } from '../shared/controls/TreeExample'
import '@wfe/components/styles.css'
export function App() {
  const [preset, setPreset] = createSignal<'default' | 'vanilla' | 'laser'>(
    'default',
  )
  const [mode, setMode] = createSignal<'light' | 'dark'>('light')
  return (
    <Theme preset={preset()} mode={mode()} accent="blue">
      <div
        style={{
          display: 'flex',
          gap: '4px',
          padding: '12px',
          'max-width': '720px',
          margin: 'auto',
        }}
      >
        <For each={['default', 'vanilla', 'laser'] as const}>
          {(value) => <Button onClick={() => setPreset(value)}>{value}</Button>}
        </For>
        <Button
          onClick={() =>
            setMode((value) => (value === 'light' ? 'dark' : 'light'))
          }
        >
          Toggle dark mode
        </Button>
      </div>
      <TreeExample comparisons />
    </Theme>
  )
}

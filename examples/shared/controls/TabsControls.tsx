import { createSignal, flush, onCleanup } from 'solid-js'
import { Button, Input, Tabs } from '@wfe/components'
export const tabsLifecycle = {
  configure: (_next: {
    value?: string
    accept?: boolean
    prevent?: boolean
    orientation?: 'horizontal' | 'vertical'
    activationMode?: 'automatic' | 'manual'
    disabled?: boolean
    dir?: 'ltr' | 'rtl'
    activeValue?: string
    preventKeys?: boolean
  }) => {},
  read: () => ({ requests: [] as string[], mounts: 0, cleanups: 0 }),
  stop: () => {},
}
function Draft(props: { label: string }) {
  mounts++
  onCleanup(() => {
    cleanups++
  })
  return <Input aria-label={props.label} defaultValue="Original draft" />
}
let mounts = 0
let cleanups = 0
export function TabsControls() {
  mounts = 0
  cleanups = 0
  const [value, setValue] = createSignal('details')
  const [dir, setDir] = createSignal<'ltr' | 'rtl'>('ltr')
  const [activeValue, setActiveValue] = createSignal('draft')
  let preventKeys = false
  const [orientation, setOrientation] = createSignal<'horizontal' | 'vertical'>(
    'horizontal',
  )
  const [activationMode, setActivationMode] = createSignal<
    'automatic' | 'manual'
  >('automatic')
  const [disabled, setDisabled] = createSignal(false)
  let accept = true
  let prevent = false
  const requests: string[] = []
  tabsLifecycle.configure = (next) => {
    if (next.dir !== undefined) setDir(next.dir)
    if (next.activeValue !== undefined) setActiveValue(next.activeValue)
    if (next.preventKeys !== undefined) preventKeys = next.preventKeys
    if (next.accept !== undefined) accept = next.accept
    if (next.prevent !== undefined) prevent = next.prevent
    if (next.value !== undefined) setValue(next.value)
    if (next.orientation !== undefined) setOrientation(next.orientation)
    if (next.activationMode !== undefined)
      setActivationMode(next.activationMode)
    if (next.disabled !== undefined) setDisabled(next.disabled)
    flush()
  }
  tabsLifecycle.read = () => ({ requests: [...requests], mounts, cleanups })
  return (
    <section class="example-stack" data-tabs-review>
      <Tabs
        id="retained-tabs"
        dir={dir()}
        value={value()}
        orientation={orientation()}
        activationMode={activationMode()}
        disabled={disabled()}
        onValueChange={(next) => {
          requests.push(next)
          if (accept) setValue(next)
        }}
      >
        <Tabs.List
          aria-label="Record sections"
          onKeyDown={(event) => {
            if (preventKeys) event.preventDefault()
          }}
        >
          <Tabs.Trigger value="details">Details</Tabs.Trigger>
          <Tabs.Trigger value="disabled" disabled>
            Unavailable
          </Tabs.Trigger>
          <Tabs.Trigger
            value="notes"
            onClick={(event) => {
              if (prevent) event.preventDefault()
            }}
          >
            Notes
          </Tabs.Trigger>
          <Tabs.Trigger value={'odd " \\ key'}>Other</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="details">
          <Draft label="Retained tab draft" />
        </Tabs.Content>
        <Tabs.Content value="notes">Record notes</Tabs.Content>
        <Tabs.Content value={'odd " \\ key'}>Other content</Tabs.Content>
      </Tabs>
      <Tabs
        id="active-tabs"
        value={activeValue()}
        onValueChange={setActiveValue}
        panelMount="active"
      >
        <Tabs.List aria-label="Disposable sections">
          <Tabs.Trigger value="draft">Draft</Tabs.Trigger>
          <Tabs.Trigger value="summary">Summary</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="draft">
          <Draft label="Disposable tab draft" />
        </Tabs.Content>
        <Tabs.Content value="summary">Summary content</Tabs.Content>
      </Tabs>
      <Button id="tabs-outside">Outside tabs</Button>
    </section>
  )
}
declare global {
  interface Window {
    tabsFixture: typeof tabsLifecycle
  }
}

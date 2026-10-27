import { Dynamic } from '@solidjs/web'
import { exampleSizing } from '../shared/appearance/sizing'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  InlineAlert,
  Progress,
  Separator,
  Skeleton,
  Spinner,
  Toast,
  uiScope,
} from '@wfe/components'
import { Show, createSignal, flush, onCleanup } from 'solid-js'

export function DisplayControls(props: { embedded?: boolean } = {}) {
  const uncontrolled = new URLSearchParams(location.search).has('defaultToast')
  const [open, setOpen] = createSignal(uncontrolled)
  const [mounted, setMounted] = createSignal(true)
  const [accept, setAccept] = createSignal(true)
  const [prevent, setPrevent] = createSignal(false)
  const [persistent, setPersistent] = createSignal(true)
  const [duration, setDuration] = createSignal(1000)
  const [loading, setLoading] = createSignal(true)
  const [value, setValue] = createSignal<number | undefined>(25)
  const [maximum, setMaximum] = createSignal(100)
  const [announce, setAnnounce] = createSignal<'off' | 'polite' | 'assertive'>(
    'off',
  )
  const [message, setMessage] = createSignal('Ready')
  let actions = 0
  let requests = 0
  let cleanups = 0
  let refs = 0
  onCleanup(() => {
    cleanups++
  })
  window.displayFixture = {
    configure(next) {
      if ('mounted' in next) setMounted(next.mounted!)
      if ('open' in next) setOpen(next.open!)
      if ('accept' in next) setAccept(next.accept!)
      if ('prevent' in next) setPrevent(next.prevent!)
      if ('persistent' in next) setPersistent(next.persistent!)
      if ('duration' in next) setDuration(next.duration!)
      if ('loading' in next) setLoading(next.loading!)
      if ('value' in next) setValue(next.value)
      if ('maximum' in next) setMaximum(next.maximum!)
      if ('announce' in next) setAnnounce(next.announce!)
      if ('message' in next) setMessage(next.message!)
      flush()
    },
    read: () => ({ open: open(), actions, requests, cleanups, refs }),
  }
  return (
    <Dynamic
      component={props.embedded ? 'section' : 'main'}
      data-ui=""
      class="example-stack"
      style={
        props.embedded ? undefined : { ...uiScope().style, ...exampleSizing }
      }
      data-ui-theme={
        new URLSearchParams(location.search).has('dark') ? 'dark' : undefined
      }
    >
      <h1>Display and status</h1>
      <div class="example-actions">
        <Button id="toast-opener" onClick={() => setOpen(true)}>
          Show notification
        </Button>
        <Button id="outside">Outside action</Button>
      </div>
      <Card
        id="display-card"
        ref={() => {
          refs++
        }}
      >
        <Badge tone="success">Complete</Badge>
        <Separator />
        <Separator orientation="vertical" />
        <InlineAlert id="inline-status" announce={announce()}>
          {message()}
        </InlineAlert>
        <Progress
          aria-label="Export progress"
          value={value()}
          max={maximum()}
        />
        <Spinner />
        <Spinner aria-label="Loading rows" />
      </Card>
      <div
        id="reserved-viewport"
        style={{
          height: '320px',
          overflow: 'auto',
          position: 'relative',
          border: 'var(--ui-border-width, 1px) solid var(--ui-border)',
        }}
      >
        <Show when={loading()} fallback={<EmptyState>No results</EmptyState>}>
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </Show>
      </div>
      <Toast.Region>
        <Show when={mounted()}>
          <Toast
            open={uncontrolled ? undefined : open()}
            defaultOpen={uncontrolled}
            persistent={persistent()}
            duration={duration()}
            onOpenChange={(value) => {
              requests++
              if (accept()) setOpen(value)
            }}
            onDismiss={() => {}}
            onKeyDown={(event) => {
              if (prevent()) event.preventDefault()
            }}
          >
            <Toast.Title>Export is ready</Toast.Title>
            <Toast.Description>{message()}</Toast.Description>
            <Button
              onClick={() => {
                actions++
              }}
            >
              Review result
            </Button>
            <Toast.CloseButton
              onClick={(event) => {
                if (prevent()) event.preventDefault()
              }}
            >
              Dismiss
            </Toast.CloseButton>
          </Toast>
        </Show>
      </Toast.Region>
      <Toast defaultOpen={false}>Initially closed</Toast>
    </Dynamic>
  )
}
declare global {
  interface Window {
    displayFixture: {
      configure: (next: {
        mounted?: boolean
        open?: boolean
        accept?: boolean
        prevent?: boolean
        persistent?: boolean
        duration?: number
        loading?: boolean
        value?: number
        maximum?: number
        announce?: 'off' | 'polite' | 'assertive'
        message?: string
      }) => void
      read: () => {
        open: boolean
        actions: number
        requests: number
        cleanups: number
        refs: number
      }
      stop?: () => void
    }
  }
}

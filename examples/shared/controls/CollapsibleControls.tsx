import { SidebarControls } from './SidebarControls'
import { createSignal, flush } from 'solid-js'
import { Button, Collapsible, Input } from '@wfe/components'

export const collapsibleLifecycle = {
  configure: (_next: {
    open?: boolean
    accept?: boolean
    prevent?: boolean
  }) => {},
  read: () => ({
    requests: [] as boolean[],
    nativeRequests: [] as boolean[],
    actions: 0,
    clicks: 0,
  }),
  stop: () => {},
}

/** One fixture exercises client rendering and hydration. */
export function CollapsibleControls() {
  const [open, setOpen] = createSignal(true)
  let accept = true
  let prevent = false
  let actions = 0
  let clicks = 0
  const requests: boolean[] = []
  const nativeRequests: boolean[] = []
  collapsibleLifecycle.configure = (next) => {
    if (next.accept !== undefined) accept = next.accept
    if (next.prevent !== undefined) prevent = next.prevent
    if (next.open !== undefined) setOpen(next.open)
    flush()
  }
  collapsibleLifecycle.read = () => ({
    requests: [...requests],
    nativeRequests: [...nativeRequests],
    actions,
    clicks,
  })
  return (
    <section class="example-stack" data-collapsible-review>
      <Collapsible
        id="controlled-disclosure"
        class={['fixture-disclosure', { 'caller-open': open() }]}
        contentClass="fixture-content"
        open={open()}
        onOpenChange={(next) => {
          requests.push(next)
          if (accept) setOpen(next)
        }}
        onClick={(event) => {
          clicks++
          if (prevent) event.preventDefault()
        }}
        summary={
          <>
            <span>Controlled details</span>{' '}
            <Button
              onClick={() => {
                actions++
              }}
            >
              Summary action
            </Button>
          </>
        }
      >
        <Input
          aria-label="Retained disclosure draft"
          defaultValue="Original draft"
        />
      </Collapsible>
      <Collapsible
        id="native-disclosure"
        summary="Native details"
        onOpenChange={(next) => nativeRequests.push(next)}
      >
        <Input
          aria-label="Native disclosure draft"
          defaultValue="Native draft"
        />
      </Collapsible>
      <SidebarControls />
      <Button id="disclosure-outside">Outside disclosure</Button>
    </section>
  )
}

declare global {
  interface Window {
    collapsibleFixture: typeof collapsibleLifecycle
  }
}

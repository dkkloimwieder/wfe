import { createSignal, flush } from 'solid-js'
import { Breadcrumbs } from '@wfe/components/breadcrumbs'
export const breadcrumbLifecycle = {
  configure: (_next: { label?: string; current?: string; href?: string }) => {},
  read: () => ({ clicks: 0, refs: 0 }),
  stop: () => {},
}
export function BreadcrumbControls() {
  const [label, setLabel] = createSignal('Review navigation')
  const [current, setCurrent] = createSignal('Record details')
  const [href, setHref] = createSignal('#breadcrumb-records')
  let clicks = 0
  let refs = 0
  breadcrumbLifecycle.configure = (next) => {
    if (next.label !== undefined) setLabel(next.label)
    if (next.current !== undefined) setCurrent(next.current)
    if (next.href !== undefined) setHref(next.href)
    flush()
  }
  breadcrumbLifecycle.read = () => ({ clicks, refs })
  return (
    <Breadcrumbs
      id="breadcrumb-review"
      aria-label={label()}
      separator="/"
      class={['caller-breadcrumb', { revised: current() !== 'Record details' }]}
    >
      <Breadcrumbs.List>
        <Breadcrumbs.Item>
          <Breadcrumbs.Link
            href={href()}
            ref={() => {
              refs++
            }}
            onClick={(event) => {
              clicks++
              event.preventDefault()
            }}
          >
            Records
          </Breadcrumbs.Link>
        </Breadcrumbs.Item>
        <Breadcrumbs.Item>
          <Breadcrumbs.Separator />
          <Breadcrumbs.Current>{current()}</Breadcrumbs.Current>
        </Breadcrumbs.Item>
      </Breadcrumbs.List>
    </Breadcrumbs>
  )
}
declare global {
  interface Window {
    breadcrumbFixture: typeof breadcrumbLifecycle
  }
}

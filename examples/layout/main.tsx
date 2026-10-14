import { render } from '@solidjs/web'
import { For, OBSERVE, action, createSignal, flush, onCleanup } from 'solid-js'
import { Button, Input } from '@wfe/components'
import {
  DashboardGrid,
  DashboardPanel,
  DashboardShell,
} from '@wfe/components/layout'
import { nativeEvents } from '@wfe/components/events'
import type { UIDensity } from '@wfe/components'
import '@wfe/components/styles.css'
import './style.css'

let release: (() => void) | undefined
let replaceRows: ((count: number) => void) | undefined
let configure:
  | ((value: {
      density?: UIDensity
      theme?: 'dark'
      scroll?: 'main' | 'content'
      navigation?: boolean
    }) => void)
  | undefined
let closeNavigation: (() => void) | undefined
let navigationMounts = 0
let navigationCleanups = 0
let visits = 0
let capture:
  ReturnType<NonNullable<typeof OBSERVE>['diagnostics']['capture']> | undefined
const events: unknown[] = []
// eslint-disable-next-line require-yield -- Use the qualified synchronous disposal path.
const disposeRoot = action(function* () {
  release?.()
})
function stop() {
  disposeRoot()
  flush()
  release = undefined
  replaceRows = configure = undefined
}
function Navigation(props: { close: () => void }) {
  const [draft, setDraft] = createSignal('Keep this draft')
  navigationMounts++
  onCleanup(() => navigationCleanups++)
  return (
    <div class="fixture-navigation">
      <a
        href="#records"
        ref={nativeEvents<HTMLAnchorElement>({ click: props.close })}
      >
        Records
      </a>
      <Input
        aria-label="Navigation draft"
        value={draft()}
        onInput={(event) => setDraft(event.currentTarget.value)}
      />
      <Button
        onClick={() => {
          visits++
          props.close()
        }}
      >
        Open reports
      </Button>
    </div>
  )
}
function start(withNavigation = true) {
  stop()
  events.push(...(capture?.stop() ?? []))
  capture = OBSERVE?.diagnostics.capture()
  release = render(() => {
    const [count, setCount] = createSignal(2)
    const [hasNavigation, setHasNavigation] = createSignal(withNavigation)
    const [density, setDensity] = createSignal<UIDensity>('compact')
    const [theme, setTheme] = createSignal<'dark' | undefined>()
    const [scroll, setScroll] = createSignal<'main' | 'content'>('content')
    replaceRows = setCount
    configure = (value) => {
      if (value.density) setDensity(value.density)
      setTheme(value.theme)
      if (value.scroll) setScroll(value.scroll)
      if (value.navigation !== undefined) setHasNavigation(value.navigation)
    }
    return (
      <DashboardShell
        id="shell"
        header={<h1>Workspace</h1>}
        density={density()}
        theme={theme()}
        scroll={scroll()}
        mainLabel="Records"
        navigation={
          hasNavigation()
            ? (controls) => {
                closeNavigation = controls.close
                return <Navigation close={controls.close} />
              }
            : undefined
        }
      >
        <DashboardPanel fill id="results-panel">
          <h2 id="records">Records</h2>
          <div id="results" tabindex={0}>
            <table>
              <tbody>
                <For
                  each={Array.from({ length: count() }, (_, index) => index)}
                >
                  {(index) => (
                    <tr>
                      <td>Row {index}</td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </DashboardPanel>
        <DashboardGrid id="grid">
          <DashboardPanel>First panel</DashboardPanel>
          <DashboardPanel>Second panel</DashboardPanel>
        </DashboardGrid>
      </DashboardShell>
    )
  }, document.getElementById('root')!)
  flush()
}
const api = {
  start,
  stop,
  replaceRows: (count: number) => {
    replaceRows?.(count)
    flush()
  },
  configure: (value: Parameters<NonNullable<typeof configure>>[0]) => {
    configure?.(value)
    flush()
  },
  close: () => {
    closeNavigation?.()
    flush()
  },
  read: () => ({ navigationMounts, navigationCleanups, visits }),
  diagnostics: () => {
    events.push(...(capture?.stop() ?? []))
    return events.splice(0)
  },
}
declare global {
  interface Window {
    layoutFixture: typeof api
  }
}
window.layoutFixture = api
start()

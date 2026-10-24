import { createFixtureDisposal } from '../shared/fixtureDisposal'
import { Theme } from '@wfe/components/theme'
import { render } from '@solidjs/web'
import { OBSERVE, createSignal, flush, onCleanup } from 'solid-js'
import {
  Button,
  Dialog,
  Input,
  Popover,
  SelectField,
  uiDensity,
} from '@wfe/components'
import {
  DashboardGrid,
  DashboardPanel,
  DashboardShell,
} from '@wfe/components/layout'
import { nativeEvents } from '@wfe/components/events'
import { createTable, Table, TableRow } from '@wfe/components/table'
import { createTableVirtualizer, VirtualRows } from '@wfe/components/virtual'
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
      context?: boolean
      footer?: boolean
    }) => void)
  | undefined
let closeNavigation: (() => void) | undefined
let navigationMounts = 0
let navigationCleanups = 0
let contextMounts = 0
let contextCleanups = 0
let visits = 0
let capture:
  ReturnType<NonNullable<typeof OBSERVE>['diagnostics']['capture']> | undefined
const events: unknown[] = []
const disposeRoot = createFixtureDisposal(() => {
  release?.()
})
function stop() {
  disposeRoot()
  flush()
  release = undefined
  replaceRows = configure = undefined
}
function HelpPopup() {
  return (
    <Popover>
      <Popover.Trigger>Navigation help</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content>
          <Popover.Title>Navigation help</Popover.Title>
          <Popover.Description>
            Application links keep their own navigation policy.
          </Popover.Description>
          <Popover.CloseButton aria-label="Close help">
            Close help
          </Popover.CloseButton>
        </Popover.Content>
      </Popover.Portal>
    </Popover>
  )
}
function WorkspaceDialog() {
  return (
    <Dialog>
      <Dialog.Trigger>Workspace preferences</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content>
          <Dialog.Title>Workspace preferences</Dialog.Title>
          <Dialog.Description>
            Example controls inside a dashboard portal.
          </Dialog.Description>
          <Input aria-label="Preference draft" />
          <Popover>
            <Popover.Trigger>Preference help</Popover.Trigger>
            <Popover.Portal>
              <Popover.Content>
                <Popover.Title>Preference help</Popover.Title>
                <Popover.Description>
                  The dialog remains open after this popup closes.
                </Popover.Description>
                <Popover.CloseButton aria-label="Close preference help">
                  Close preference help
                </Popover.CloseButton>
              </Popover.Content>
            </Popover.Portal>
          </Popover>
          <Dialog.CloseButton aria-label="Close preferences">
            Close preferences
          </Dialog.CloseButton>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
function Results(props: { count: number; density: UIDensity }) {
  const table = createTable<{ name: string }>({
    source: {
      ids: () =>
        Array.from({ length: props.count }, (_, index) => String(index)),
      get: (id) => ({ name: `Row ${id}` }),
    },
    columns: [{ id: 'name', header: 'Name', accessorKey: 'name', size: 960 }],
  })
  let viewport: HTMLDivElement | undefined
  const virtualizer = createTableVirtualizer({
    mode: 'fixed',
    get count() {
      return props.count
    },
    get rowHeight() {
      return uiDensity(props.density).rowHeight
    },
    getItemKey: (index) => String(index),
    getIndexForKey: (key) => Number(key),
    getScrollElement: () => viewport ?? null,
  })
  return (
    <div
      id="results"
      tabindex={0}
      aria-label="Virtual records"
      ref={(node) => {
        viewport = node
      }}
    >
      <Table
        table={table}
        accessibleLabel="Virtual records"
        header={(column) => <span>{String(column.columnDef?.header)}</span>}
        renderBody={() => (
          <VirtualRows
            window={virtualizer}
            layout="table"
            columns={() => 1}
            renderRow={(id) => <TableRow table={table} id={id} />}
          />
        )}
      />
    </div>
  )
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
      <HelpPopup />
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
function Context(props: { close: () => void }) {
  const [draft, setDraft] = createSignal('Context draft')
  const [choice, setChoice] = createSignal('a')
  contextMounts++
  onCleanup(() => contextCleanups++)
  return (
    <div class="ui-dashboard-menu">
      <Input
        aria-label="Context draft"
        value={draft()}
        onValueChange={setDraft}
      />
      <SelectField
        label="Context choice"
        choices={[
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Beta' },
        ]}
        value={choice()}
        onValueChange={setChoice}
      />
      <Button onClick={props.close}>Open context report</Button>
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
    const [hasContext, setHasContext] = createSignal(false)
    const [hasFooter, setHasFooter] = createSignal(false)
    const [density, setDensity] = createSignal<UIDensity>('compact')
    const [theme, setTheme] = createSignal<'dark' | undefined>()
    const [scroll, setScroll] = createSignal<'main' | 'content'>('content')
    replaceRows = setCount
    configure = (value) => {
      if (value.density) setDensity(value.density)
      setTheme(value.theme)
      if (value.scroll) setScroll(value.scroll)
      if (value.navigation !== undefined) setHasNavigation(value.navigation)
      if (value.context !== undefined) setHasContext(value.context)
      if (value.footer !== undefined) setHasFooter(value.footer)
    }
    return (
      <Theme
        density={density()}
        mode={theme() === 'dark' ? 'dark' : 'light'}
        style={{ height: '100%' }}
      >
        <DashboardShell
          id="shell"
          context={
            hasContext()
              ? (controls) => <Context close={controls.close} />
              : undefined
          }
          footer={hasFooter() ? null : undefined}
          footerLabel="Workspace footer"
          header={
            <>
              <h1>Workspace</h1>
              <WorkspaceDialog />
            </>
          }
          density={density()}
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
            <Results count={count()} density={density()} />
          </DashboardPanel>
          <DashboardGrid id="grid">
            <DashboardPanel>First panel</DashboardPanel>
            <DashboardPanel>Second panel</DashboardPanel>
          </DashboardGrid>
        </DashboardShell>
      </Theme>
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
  read: () => ({
    navigationMounts,
    navigationCleanups,
    contextMounts,
    contextCleanups,
    visits,
  }),
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

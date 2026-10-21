import { For, Show, createMemo, createSignal } from 'solid-js'
import { Button, Card, Checkbox, Icon, Input } from '@wfe/components'
import {
  DashboardShell,
  SidebarContextSwitcher,
  SidebarGroup,
} from '@wfe/components/layout'
import type {
  SidebarContext,
  DashboardNavigation,
} from '@wfe/components/layout'

type Context = SidebarContext & { parentId?: string }
const initial: Context[] = [
  { id: 'org', kind: 'Organization', name: 'Example' },
  { id: 'atlas', kind: 'Project', name: 'Atlas', parentId: 'org' },
  { id: 'beacon', kind: 'Project', name: 'Beacon', parentId: 'org' },
  {
    id: 'closed',
    kind: 'Project',
    name: 'Unavailable',
    parentId: 'org',
    disabled: true,
  },
  { id: 'dev', kind: 'Environment', name: 'Atlas / dev', parentId: 'atlas' },
  {
    id: 'prod',
    kind: 'Environment',
    name: 'Atlas / production',
    parentId: 'atlas',
  },
]

/** Mock application: context relationships, menus and accepted state stay here. */
export function ContextControls(props: { embedded?: boolean }) {
  const [rows, setRows] = createSignal(initial)
  const [current, setCurrent] = createSignal<Context>(initial[1]!)
  const [selected, setSelected] = createSignal('overview')
  const [compact, setCompact] = createSignal(false)
  const [expanded, setExpanded] = createSignal(true)
  const [reject, setReject] = createSignal(false)
  const [disabled, setDisabled] = createSignal(false)
  const [message, setMessage] = createSignal('')
  const [heading, setHeading] = createSignal<HTMLHeadingElement>()
  const siblings = createMemo(() =>
    rows().filter((row) => row.parentId === current().parentId),
  )
  const children = createMemo(() =>
    rows().filter((row) => row.parentId === current().id),
  )
  const parent = () => rows().find((row) => row.id === current().parentId)
  function choose(value: SidebarContext) {
    setMessage(`Requested ${value.kind} ${value.name}`)
    if (reject()) return
    const next = rows().find((row) => row.id === value.id)
    if (!next || next.disabled) return
    setCurrent(next)
    setSelected('overview')
    queueMicrotask(() => heading()?.focus())
  }
  function Menu(props: {
    compact: boolean
    expand: () => void
    close: () => void
  }) {
    const entries = () =>
      current().kind === 'Environment'
        ? ['Workloads', 'Live releases', 'Operations', 'Roles', 'Members']
        : ['Overview', 'Members']
    return (
      <div class="ui-dashboard-menu" data-context-menu="">
        <SidebarContextSwitcher
          value={current()}
          options={siblings()}
          parent={parent()}
          onValueChange={choose}
          compact={props.compact}
          icon={<Icon name="layout" />}
          disabled={disabled()}
        />
        <For each={entries()}>
          {(label) => (
            <a
              href={`#${label.toLowerCase().replaceAll(' ', '-')}`}
              aria-current={
                selected() === label.toLowerCase() ? 'page' : undefined
              }
              title={label}
              onClick={(event) => {
                if (
                  event.button ||
                  event.ctrlKey ||
                  event.metaKey ||
                  event.shiftKey ||
                  event.altKey
                )
                  return
                event.preventDefault()
                setSelected(label.toLowerCase())
                props.close()
              }}
            >
              <Icon name="navigation" />
              <Show when={!props.compact}>{label}</Show>
              <Show when={props.compact}>
                <span class="sr-only">{label}</span>
              </Show>
            </a>
          )}
        </For>
        <Show when={children().length}>
          <SidebarGroup
            label={
              current().kind === 'Organization' ? 'Projects' : 'Environments'
            }
            icon={<Icon name="grid" />}
            compact={props.compact}
            open={expanded()}
            onOpenChange={setExpanded}
            onExpand={props.expand}
          >
            {(close) => (
              <For each={children()}>
                {(child) => (
                  <Button
                    disabled={child.disabled}
                    onClick={() => {
                      choose(child)
                      close()
                      props.close()
                    }}
                  >
                    {child.name}
                  </Button>
                )}
              </For>
            )}
          </SidebarGroup>
        </Show>
      </div>
    )
  }
  function Controls() {
    return (
      <Card class="example-stack" data-context-controls="">
        <h2 ref={setHeading} tabindex={-1}>
          {current().kind} {current().name}
        </h2>
        <p>The application supplies each context, its parent and its menu.</p>
        <p>
          Selected menu: <span data-context-route="">{selected()}</span>
        </p>
        <Checkbox checked={reject()} onChange={setReject}>
          <Checkbox.Input />
          <Checkbox.Control>
            <Checkbox.Indicator>
              <Icon name="check" />
            </Checkbox.Indicator>
          </Checkbox.Control>
          <Checkbox.Label>Reject context changes</Checkbox.Label>
        </Checkbox>
        <Checkbox checked={disabled()} onChange={setDisabled}>
          <Checkbox.Input />
          <Checkbox.Control>
            <Checkbox.Indicator>
              <Icon name="check" />
            </Checkbox.Indicator>
          </Checkbox.Control>
          <Checkbox.Label>Disable context switcher</Checkbox.Label>
        </Checkbox>
        <Button
          onClick={() => setRows((items) => items.map((item) => ({ ...item })))}
        >
          Refresh available contexts
        </Button>
        <Button
          onClick={() =>
            setRows((items) =>
              items.map((item) =>
                item.id === 'beacon'
                  ? { ...item, disabled: !item.disabled }
                  : item,
              ),
            )
          }
        >
          Toggle sibling availability
        </Button>
        <Button
          onClick={() =>
            setRows((items) => items.filter((item) => item.id !== 'beacon'))
          }
        >
          Remove sibling
        </Button>
        <Button
          onClick={() =>
            setRows((items) =>
              items.filter((item) => item.id !== current().parentId),
            )
          }
        >
          Remove parent
        </Button>
        <Button
          onClick={() =>
            setRows((items) => items.filter((item) => item.id !== current().id))
          }
        >
          Hide current choice
        </Button>
        <Button onClick={() => setRows(initial.map((item) => ({ ...item })))}>
          Restore contexts
        </Button>
        <Input
          aria-label="Retained note"
          placeholder="A draft independent of context"
        />
        <output data-context-request="">{message()}</output>
      </Card>
    )
  }
  return (
    <div
      data-context-review=""
      class="example-stack"
      style={{ height: props.embedded ? undefined : '100dvh' }}
    >
      <Show
        when={!props.embedded}
        fallback={
          <>
            <Button
              onClick={() => setCompact(!compact())}
              aria-pressed={compact() ? 'true' : 'false'}
            >
              Compact navigation
            </Button>
            <nav
              aria-label="Context navigation"
              style={{
                width: compact() ? '3.5rem' : '18rem',
                'max-width': '100%',
              }}
            >
              <Menu
                compact={compact()}
                expand={() => setCompact(false)}
                close={() => {}}
              />
            </nav>
            <Controls />
          </>
        }
      >
        <DashboardShell
          navigationLabel="Context navigation"
          toggleLabel="Context navigation"
          mainLabel="Context content"
          navigationCollapsed={compact()}
          onNavigationCollapsedChange={setCompact}
          navigation={(navigation: DashboardNavigation) => (
            <Menu
              compact={navigation.compact()}
              expand={() => setCompact(false)}
              close={navigation.close}
            />
          )}
          header={
            <>
              <span>Context navigation example</span>
              <Button
                onClick={() => setCompact(!compact())}
                aria-pressed={compact() ? 'true' : 'false'}
              >
                Compact navigation
              </Button>
            </>
          }
          footer={<span />}
        >
          <Controls />
        </DashboardShell>
      </Show>
    </div>
  )
}

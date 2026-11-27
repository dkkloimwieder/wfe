import { createSignal, Show } from 'solid-js'
import {
  Accordion,
  Breadcrumbs,
  Button,
  ButtonLink,
  Card,
  Collapsible,
  CollapsibleSection,
  Command,
  CommandPalette,
  ContextMenu,
  DropdownMenu,
  Icon,
  SidebarContextSwitcher,
  SidebarGroup,
  Tabs,
  Toggle,
  ToggleGroup,
} from '@wfe/components'
import { Tree } from '@wfe/components/tree'
import type { ColorRole } from '@wfe/components/theme'
import { buttonVariants } from './variant-button-matrix'
import {
  actionStates,
  choiceSnapshot,
  editingStates,
  interactiveStates,
  roleSpecimens,
  specimen,
  stateProps,
  type State,
} from './variant-types'

const noop = () => {}
const preventDefault = (event: Event) => event.preventDefault()
const disclosureStates = [...interactiveStates, 'open', 'closed'] as const
const sidebarHeaderTarget = { stateTarget: '.ui-sidebar-group-panel > summary' }
const commandItems = [
  {
    id: 'copy',
    label: 'Copy record',
    description: 'Keep the original record',
    shortcut: 'Ctrl+C',
  },
  { id: 'move', label: 'Move record', disabled: true },
]
// The live sample needs more than one enabled item to show highlight moves.
const liveCommandItems = [
  ...commandItems.slice(0, 1),
  { id: 'pin', label: 'Pin record' },
  { id: 'archive', label: 'Archive record' },
  ...commandItems.slice(1),
]

function MenuSample(props: {
  state: State
  context?: boolean
  items?: boolean
  live?: boolean
  tone?: ColorRole
}) {
  const Menu = props.context ? ContextMenu : DropdownMenu
  const open = () =>
    Boolean(
      props.items || ['open', 'selected', 'checked'].includes(props.state),
    )
  const triggerDisabled = () => !props.items && props.state === 'disabled'
  const choice = (target = false) =>
    props.live ? {} : choiceSnapshot(props.state, target && props.items)
  return (
    <Menu.Root open={props.live ? undefined : open()} modal={false}>
      {props.context ? (
        <ContextMenu.Trigger
          disabled={triggerDisabled()}
          aria-label="Project record"
          style={{ padding: '1rem', border: '1px solid var(--ui-border)' }}
        >
          <Card>
            <h3>Project Atlas</h3>
            <p>Right-click, or focus and press Shift+F10.</p>
          </Card>
        </ContextMenu.Trigger>
      ) : (
        <DropdownMenu.Trigger disabled={triggerDisabled()} tone={props.tone}>
          {props.tone ? 'Actions' : 'Record actions'}
        </DropdownMenu.Trigger>
      )}
      <Menu.Portal>
        <Menu.Content onOpenAutoFocus={props.live ? undefined : preventDefault}>
          <Menu.Group>
            <Menu.GroupLabel>Record</Menu.GroupLabel>
            <Menu.Item {...choice(true)} disabled={props.state === 'disabled'}>
              <Menu.ItemLabel>Copy</Menu.ItemLabel>
              <Menu.ItemDescription>Keep the original</Menu.ItemDescription>
            </Menu.Item>
            <Menu.Item {...choice()} disabled>
              Delete
            </Menu.Item>
            <Menu.CheckboxItem
              {...choice()}
              checked={props.live ? undefined : props.state === 'checked'}
            >
              <Menu.ItemIndicator>
                <Icon name="check" />
              </Menu.ItemIndicator>
              Pin record
            </Menu.CheckboxItem>
          </Menu.Group>
          <Menu.Separator />
          <Menu.RadioGroup
            defaultValue={props.live ? 'personal' : undefined}
            value={
              props.live
                ? undefined
                : props.state === 'selected'
                  ? 'team'
                  : 'personal'
            }
          >
            <Menu.RadioItem {...choice()} value="personal">
              <Menu.ItemIndicator>
                <Icon name="check" />
              </Menu.ItemIndicator>
              Personal
            </Menu.RadioItem>
            <Menu.RadioItem {...choice()} value="team">
              <Menu.ItemIndicator>
                <Icon name="check" />
              </Menu.ItemIndicator>
              Team
            </Menu.RadioItem>
          </Menu.RadioGroup>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  )
}

export const specimens = [
  ...buttonVariants('text', (appearance, disabled) => (
    <Button {...appearance} disabled={disabled}>
      Save
    </Button>
  )),
  ...buttonVariants('icon-text', (appearance, disabled) => (
    <Button {...appearance} disabled={disabled}>
      <Icon name="refresh" /> Refresh
    </Button>
  )),
  ...buttonVariants('link', (appearance, disabled) => (
    <ButtonLink
      {...appearance}
      href="#variants"
      aria-disabled={disabled ? 'true' : undefined}
      tabindex={disabled ? -1 : undefined}
      onClick={preventDefault}
    >
      Open
    </ButtonLink>
  )),
  specimen(
    'toggle/outline',
    'Toggle / outline',
    [...actionStates, 'checked', 'read-only'],
    (state) => (
      <Toggle
        {...stateProps(state)}
        pressed={state === 'checked'}
        onPressedChange={() => {}}
      >
        Pin
      </Toggle>
    ),
  ),
  ...roleSpecimens('toggle/tone', 'Toggle', (tone) => (
    <Toggle tone={tone} pressed={false} onPressedChange={() => {}}>
      Pin
    </Toggle>
  )),
  ...roleSpecimens('toggle-group/tone', 'ToggleGroup', (tone) => (
    <ToggleGroup
      tone={tone}
      items={[
        { value: 'left', label: 'Left' },
        { value: 'right', label: 'Right' },
      ]}
      aria-label="Alignment"
      onValueChange={() => {}}
    />
  )),
  ...(['single', 'multiple'] as const).flatMap((selection) =>
    (['horizontal', 'vertical'] as const).map((orientation) =>
      specimen(
        `toggle-group/${selection}/${orientation}`,
        `ToggleGroup / ${selection} / ${orientation}`,
        [...editingStates, 'selected'],
        (state) => {
          const shared = {
            ...stateProps(state),
            orientation,
            'aria-label': 'Alignment',
            items: [
              { value: 'left', label: 'Left' },
              { value: 'right', label: 'Right' },
            ],
            onValueChange: () => {},
          }
          return selection === 'multiple' ? (
            <ToggleGroup
              {...shared}
              multiple
              value={state === 'selected' ? ['left', 'right'] : []}
            />
          ) : (
            <ToggleGroup
              {...shared}
              value={state === 'selected' ? 'left' : undefined}
            />
          )
        },
        {
          live: () => (
            <LiveToggleGroup
              orientation={orientation}
              multiple={selection === 'multiple'}
            />
          ),
        },
      ),
    ),
  ),
  ...(['start', 'end'] as const).map((placement) =>
    specimen(
      `collapsible/${placement}`,
      `Collapsible / indicator at ${placement}`,
      disclosureStates,
      (state) => (
        <Collapsible
          indicatorPlacement={placement}
          summary="Record details"
          open={state === 'open'}
        >
          Sample record
        </Collapsible>
      ),
      {
        live: () => (
          <Collapsible indicatorPlacement={placement} summary="Record details">
            Sample record
          </Collapsible>
        ),
      },
    ),
  ),
  ...([false, true] as const).map((icon) =>
    specimen(
      `collapsible-section/${icon ? 'icon' : 'text'}`,
      `CollapsibleSection / ${icon ? 'icon and count' : 'text'}`,
      [...disclosureStates, 'selected'],
      (state) => (
        <CollapsibleSection
          title="Records"
          count={icon ? '2' : undefined}
          icon={icon ? <Icon name="grid" /> : undefined}
          active={state === 'selected'}
          open={state === 'open'}
        >
          Sample records
        </CollapsibleSection>
      ),
      {
        live: () => (
          <CollapsibleSection
            title="Records"
            count={icon ? '2' : undefined}
            icon={icon ? <Icon name="grid" /> : undefined}
          >
            Sample records
          </CollapsibleSection>
        ),
      },
    ),
  ),
  ...([false, true] as const).map((multiple) =>
    specimen(
      `accordion/${multiple ? 'multiple' : 'single'}`,
      `Accordion / ${multiple ? 'multiple' : 'single'}`,
      disclosureStates,
      (state) => (
        <Accordion
          multiple={multiple}
          value={state === 'open' ? (multiple ? ['a', 'b'] : ['a']) : []}
        >
          <Accordion.Item value="a" summary="Overview">
            Sample record
          </Accordion.Item>
          <Accordion.Item value="b" summary="Notes">
            Sample note
          </Accordion.Item>
        </Accordion>
      ),
      {
        live: () => (
          <Accordion multiple={multiple}>
            <Accordion.Item value="a" summary="Overview">
              Sample record
            </Accordion.Item>
            <Accordion.Item value="b" summary="Notes">
              Sample note
            </Accordion.Item>
          </Accordion>
        ),
      },
    ),
  ),
  ...(['horizontal', 'vertical'] as const).flatMap((orientation) => [
    specimen(
      `tabs/${orientation}`,
      `Tabs / ${orientation}`,
      [...actionStates, 'selected'],
      (state) => (
        <Tabs
          value={state === 'selected' ? 'notes' : 'details'}
          orientation={orientation}
        >
          <Tabs.List aria-label="Record">
            <Tabs.Trigger value="notes" disabled={state === 'disabled'}>
              Notes
            </Tabs.Trigger>
            <Tabs.Trigger value="details">Details</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="details">Sample record</Tabs.Content>
          <Tabs.Content value="notes">Sample note</Tabs.Content>
        </Tabs>
      ),
      { live: () => <LiveTabs orientation={orientation} /> },
    ),
  ]),
  specimen(
    'breadcrumbs/default',
    'Breadcrumbs / link and current page',
    interactiveStates,
    () => (
      <Breadcrumbs aria-label="Record location">
        <Breadcrumbs.List>
          <Breadcrumbs.Item>
            <Breadcrumbs.Link href="#variants" onClick={preventDefault}>
              Records
            </Breadcrumbs.Link>
          </Breadcrumbs.Item>
          <Breadcrumbs.Item>
            <Breadcrumbs.Separator />
            <Breadcrumbs.Current>Details</Breadcrumbs.Current>
          </Breadcrumbs.Item>
        </Breadcrumbs.List>
      </Breadcrumbs>
    ),
  ),
  ...(['dropdown-menu', 'context-menu'] as const).flatMap((kind) => {
    const context = kind === 'context-menu'
    const name = context ? 'ContextMenu' : 'DropdownMenu'
    const live = () => <MenuSample state="rest" context={context} live />
    return [
      specimen(
        `${kind}/trigger`,
        `${name} / trigger`,
        actionStates,
        (state) => <MenuSample state={state} context={context} />,
        { live },
      ),
      specimen(
        `${kind}/items`,
        `${name} / item states`,
        [...actionStates, 'checked', 'selected'],
        (state) => <MenuSample state={state} context={context} items />,
        { live },
      ),
      specimen(
        `${kind}/content`,
        `${name} / items`,
        ['open', 'checked', 'selected'],
        (state) => <MenuSample state={state} context={context} />,
        { baseline: `${kind}/trigger`, live },
      ),
    ]
  }),
  ...roleSpecimens(
    'dropdown-menu/trigger-tone',
    'DropdownMenu.Trigger',
    (tone) => (
      <DropdownMenu.Root open={false}>
        <DropdownMenu.Trigger tone={tone}>Actions</DropdownMenu.Trigger>
      </DropdownMenu.Root>
    ),
    ['rest'],
    (tone) => <MenuSample state="rest" tone={tone} live />,
  ),
  ...(['inline', 'flyout', 'expand'] as const).map((kind) =>
    specimen(
      `sidebar-group/${kind}`,
      `SidebarGroup / ${kind}`,
      [
        ...(kind === 'inline' ? actionStates : interactiveStates),
        'closed',
        'selected',
        ...(kind === 'inline' ? ['open' as const] : []),
      ],
      (state) => (
        <SidebarGroup
          label="Records"
          compact={kind !== 'inline'}
          behavior={kind === 'expand' ? 'expand' : 'flyout'}
          open={state === 'open' || (kind === 'inline' && state === 'selected')}
          active={kind !== 'inline' && state === 'selected'}
          onOpenChange={noop}
          onExpand={noop}
        >
          {() => (
            <a
              href="#variants"
              aria-current={state === 'selected' ? 'page' : undefined}
              onClick={preventDefault}
            >
              All records
            </a>
          )}
        </SidebarGroup>
      ),
      {
        ...(kind === 'inline' ? sidebarHeaderTarget : {}),
        live: () => <LiveSidebarGroup kind={kind} />,
      },
    ),
  ),
  ...([false, true] as const).map((compact) =>
    specimen(
      `sidebar-context-switcher/${compact ? 'compact' : 'full'}`,
      `SidebarContextSwitcher / ${compact ? 'compact' : 'full'}`,
      actionStates,
      (state) => (
        <SidebarContextSwitcher
          value={{ id: 'review', name: 'Review', kind: 'Workspace' }}
          options={[{ id: 'review', name: 'Review', kind: 'Workspace' }]}
          compact={compact}
          disabled={state === 'disabled'}
          onValueChange={noop}
        />
      ),
      {
        live: () => <LiveSidebarContextSwitcher compact={compact} />,
      },
    ),
  ),
  ...(['results', 'loading', 'empty', 'error'] as const).map((kind) =>
    specimen(
      `command/${kind}`,
      `Command / ${kind}`,
      kind === 'results' ? actionStates : interactiveStates,
      (state) => (
        <Command
          items={
            kind === 'empty'
              ? []
              : state === 'disabled'
                ? commandItems.map((item) => ({ ...item, disabled: true }))
                : commandItems
          }
          loading={kind === 'loading'}
          error={kind === 'error' ? 'Could not load records.' : undefined}
          label="Find an action"
        />
      ),
      {
        live: () => (
          <Command
            items={kind === 'empty' ? [] : liveCommandItems}
            loading={kind === 'loading'}
            error={kind === 'error' ? 'Could not load records.' : undefined}
            label="Find an action"
          />
        ),
      },
    ),
  ),
  specimen(
    'command-palette/trigger',
    'CommandPalette / trigger',
    interactiveStates,
    () => (
      <CommandPalette
        title="Find an action"
        label="Find an action"
        items={commandItems}
        open={false}
        trigger="Find an action"
      />
    ),
    {
      live: () => (
        <CommandPalette
          title="Find an action"
          label="Find an action"
          items={commandItems}
          trigger="Find an action"
        />
      ),
    },
  ),
  specimen(
    'sidebar-group/items',
    'SidebarGroup / items',
    [...actionStates, 'selected'],
    (state) => (
      <SidebarGroup
        label="Records"
        open
        compact={false}
        onOpenChange={noop}
        onExpand={noop}
      >
        {() => (
          <a
            href="#variants"
            aria-current={state === 'selected' ? 'page' : undefined}
            onClick={(event) => event.preventDefault()}
          >
            All records
          </a>
        )}
      </SidebarGroup>
    ),
    {
      ...sidebarHeaderTarget,
      live: () => <LiveSidebarGroup kind="inline" />,
    },
  ),
  specimen(
    'tree/items',
    'Tree / items',
    [...actionStates, 'selected', 'open'],
    (state) => (
      <Tree
        label="Folders"
        nodes={[
          {
            id: 'records',
            label: 'Records',
            disabled: state === 'disabled',
            children: [{ id: 'reviews', label: 'Reviews' }],
          },
          { id: 'archive', label: 'Archive' },
        ]}
        selected={state === 'selected' ? ['records'] : []}
        expanded={state === 'open' ? ['records'] : []}
        onSelectionChange={noop}
        onExpandedChange={noop}
      />
    ),
    { live: () => <LiveTree /> },
  ),
]

function LiveSidebarGroup(props: { kind: 'inline' | 'flyout' | 'expand' }) {
  const [compact, setCompact] = createSignal(props.kind !== 'inline')
  const [open, setOpen] = createSignal(false)
  return (
    <SidebarGroup
      label="Records"
      compact={compact()}
      behavior={props.kind === 'expand' ? 'expand' : 'flyout'}
      open={open()}
      onOpenChange={setOpen}
      onExpand={() => setCompact(false)}
    >
      {(close) => (
        <>
          <a
            href="#variants"
            onClick={(event) => {
              event.preventDefault()
              close()
            }}
          >
            All records
          </a>
          <Show when={props.kind === 'expand'}>
            <Button
              onClick={() => {
                setOpen(false)
                setCompact(true)
              }}
            >
              Collapse sidebar
            </Button>
          </Show>
        </>
      )}
    </SidebarGroup>
  )
}

function LiveSidebarContextSwitcher(props: { compact: boolean }) {
  const review = { id: 'review', name: 'Review', kind: 'Workspace' }
  const options = [review, { id: 'audit', name: 'Audit', kind: 'Workspace' }]
  const [value, setValue] = createSignal(review)
  return (
    <SidebarContextSwitcher
      value={value()}
      options={options}
      compact={props.compact}
      onValueChange={setValue}
    />
  )
}

function LiveTree() {
  const [selected, setSelected] = createSignal<readonly string[]>([])
  const [expanded, setExpanded] = createSignal<readonly string[]>([])
  return (
    <Tree
      label="Folders"
      nodes={[
        {
          id: 'records',
          label: 'Records',
          children: [{ id: 'reviews', label: 'Reviews' }],
        },
        { id: 'archive', label: 'Archive' },
      ]}
      selected={selected()}
      expanded={expanded()}
      onSelectionChange={setSelected}
      onExpandedChange={setExpanded}
    />
  )
}

function LiveToggleGroup(props: {
  orientation: 'horizontal' | 'vertical'
  multiple: boolean
}) {
  const items = [
    { value: 'left', label: 'Left' },
    { value: 'right', label: 'Right' },
  ]
  const [single, setSingle] = createSignal<string | undefined>()
  const [many, setMany] = createSignal<string[]>([])
  return props.multiple ? (
    <ToggleGroup
      orientation={props.orientation}
      aria-label="Alignment"
      items={items}
      multiple
      value={many()}
      onValueChange={setMany}
    />
  ) : (
    <ToggleGroup
      orientation={props.orientation}
      aria-label="Alignment"
      items={items}
      value={single()}
      onValueChange={setSingle}
    />
  )
}

function LiveTabs(props: { orientation: 'horizontal' | 'vertical' }) {
  const [value, setValue] = createSignal('details')
  return (
    <Tabs
      value={value()}
      onValueChange={setValue}
      orientation={props.orientation}
    >
      <Tabs.List aria-label="Record">
        <Tabs.Trigger value="notes">Notes</Tabs.Trigger>
        <Tabs.Trigger value="details">Details</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="details">Sample record</Tabs.Content>
      <Tabs.Content value="notes">Sample note</Tabs.Content>
    </Tabs>
  )
}

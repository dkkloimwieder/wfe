import {
  Accordion,
  AlertDialog,
  Badge,
  Breadcrumbs,
  Button,
  Card,
  Collapsible,
  CollapsibleSection,
  Command,
  CommandPalette,
  ContextMenu,
  DashboardPanel,
  Dialog,
  DropdownMenu,
  DragHandle,
  createDragDrop,
  createDraggable,
  EmptyState,
  EntryPanel,
  EntryPanelActions,
  FieldGroup,
  FieldSet,
  FieldValue,
  Icon,
  InlineAlert,
  Input,
  InputGroup,
  Popover,
  Progress,
  Resizable,
  Separator,
  Sheet,
  SidebarContextSwitcher,
  SidebarGroup,
  Skeleton,
  Spinner,
  StatusTile,
  Tabs,
  Toast,
  Tooltip,
  ValueDisplay,
  VALUE_FORMATS,
} from '@wfe/components'
import { LabeledField } from './variant-fields'
import {
  actionStates,
  interactiveStates,
  specimen,
  type State,
} from './variant-types'

const noop = () => {}
const preventFocus = (event: Event) => event.preventDefault()
const displayTones = ['neutral', 'success', 'warning', 'error'] as const
const disclosureStates = [...interactiveStates, 'open', 'closed'] as const
const commandItems = [
  {
    id: 'copy',
    label: 'Copy record',
    description: 'Keep the original record',
    shortcut: 'Ctrl+C',
  },
  { id: 'move', label: 'Move record', disabled: true },
]

function MenuSample(props: { state: State; context?: boolean }) {
  const Menu = props.context ? ContextMenu : DropdownMenu
  const open = () => ['open', 'selected', 'checked'].includes(props.state)
  return (
    <Menu.Root open={open()} modal={false}>
      {props.context ? (
        <ContextMenu.Trigger disabled={props.state === 'disabled'}>
          Record actions
        </ContextMenu.Trigger>
      ) : (
        <DropdownMenu.Trigger disabled={props.state === 'disabled'}>
          Record actions
        </DropdownMenu.Trigger>
      )}
      <Menu.Portal>
        <Menu.Content onOpenAutoFocus={preventFocus}>
          <Menu.Group>
            <Menu.GroupLabel>Record</Menu.GroupLabel>
            <Menu.Item>
              <Menu.ItemLabel>Copy</Menu.ItemLabel>
              <Menu.ItemDescription>Keep the original</Menu.ItemDescription>
            </Menu.Item>
            <Menu.Item disabled>Delete</Menu.Item>
            <Menu.CheckboxItem checked={props.state === 'checked'}>
              <Menu.ItemIndicator>
                <Icon name="check" />
              </Menu.ItemIndicator>
              Pin record
            </Menu.CheckboxItem>
          </Menu.Group>
          <Menu.Separator />
          <Menu.RadioGroup
            value={props.state === 'selected' ? 'team' : 'personal'}
          >
            <Menu.RadioItem value="personal">
              <Menu.ItemIndicator>
                <Icon name="check" />
              </Menu.ItemIndicator>
              Personal
            </Menu.RadioItem>
            <Menu.RadioItem value="team">
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

function DragHandleSample(props: { state: State }) {
  const disabled = () => props.state === 'disabled'
  const drag = createDraggable(createDragDrop(), {
    id: 'record',
    label: 'Sample record',
    data: null,
    get disabled() {
      return disabled()
    },
  })
  return (
    <div ref={(node) => drag.ref(node)}>
      <DragHandle drag={drag} disabled={disabled()} label="Move record" />
    </div>
  )
}

export const surfaceSpecimens = [
  specimen('popover/trigger', 'Popover / trigger', actionStates, (state) => (
    <Popover open={false}>
      <Popover.Trigger disabled={state === 'disabled'}>Details</Popover.Trigger>
    </Popover>
  )),
  specimen(
    'popover/surface',
    'Popover / surface',
    ['open'],
    () => (
      <Popover open>
        <Popover.Trigger>Details</Popover.Trigger>
        <Popover.Portal>
          <Popover.Content onOpenAutoFocus={preventFocus}>
            <Popover.Title>Record details</Popover.Title>
            <Popover.Description>Review the sample record.</Popover.Description>
            <Popover.CloseButton>Close</Popover.CloseButton>
          </Popover.Content>
        </Popover.Portal>
      </Popover>
    ),
    { columns: 1 },
  ),
  specimen('tooltip/trigger', 'Tooltip / trigger', actionStates, (state) => (
    <Tooltip open={false}>
      <Tooltip.Trigger as={Button} disabled={state === 'disabled'}>
        More information
      </Tooltip.Trigger>
    </Tooltip>
  )),
  specimen(
    'tooltip/content',
    'Tooltip / content',
    ['open'],
    () => (
      <Tooltip open>
        <Tooltip.Trigger as={Button}>More information</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content>View the sample record.</Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip>
    ),
    { columns: 1 },
  ),
  ...(['dropdown-menu', 'context-menu'] as const).flatMap((kind) => {
    const context = kind === 'context-menu'
    const name = context ? 'ContextMenu' : 'DropdownMenu'
    return [
      specimen(
        `${kind}/trigger`,
        `${name} / trigger`,
        actionStates,
        (state) => <MenuSample state={state} context={context} />,
      ),
      specimen(
        `${kind}/content`,
        `${name} / items`,
        ['open', 'checked', 'selected'],
        (state) => <MenuSample state={state} context={context} />,
      ),
    ]
  }),
  ...(
    [
      ['dialog', 'Dialog', Dialog],
      ['sheet', 'Sheet', Sheet],
    ] as const
  ).flatMap(([id, label, Surface]) => [
    specimen(`${id}/trigger`, `${label} / trigger`, actionStates, (state) => (
      <Surface.Root open={false}>
        <Surface.Trigger disabled={state === 'disabled'}>
          Details
        </Surface.Trigger>
      </Surface.Root>
    )),
    specimen(
      `${id}/surface`,
      `${label} / surface`,
      ['open'],
      () => (
        <Surface.Root open modal={false}>
          <Surface.Content onOpenAutoFocus={preventFocus}>
            <Surface.Title>Record details</Surface.Title>
            <Surface.Description>Review the sample record.</Surface.Description>
            <Surface.CloseButton>Close</Surface.CloseButton>
          </Surface.Content>
        </Surface.Root>
      ),
      { columns: 1 },
    ),
  ]),
  specimen(
    'alert-dialog/trigger',
    'AlertDialog / trigger',
    actionStates,
    (state) => (
      <AlertDialog.Root open={false}>
        <AlertDialog.Trigger disabled={state === 'disabled'}>
          Confirm
        </AlertDialog.Trigger>
      </AlertDialog.Root>
    ),
  ),
  specimen('card/default', 'Card', ['rest'], () => <Card>Sample record</Card>),
  specimen('dashboard-panel/default', 'DashboardPanel', ['rest'], () => (
    <DashboardPanel>Sample records</DashboardPanel>
  )),
  specimen('dashboard-panel/fill', 'DashboardPanel / fill', ['rest'], () => (
    <DashboardPanel fill>Sample records</DashboardPanel>
  )),
  specimen(
    'field-group/default',
    'FieldGroup',
    ['rest', 'disabled'],
    (state) => (
      <FieldGroup
        title="Record"
        help="Edit the record."
        disabled={state === 'disabled'}
      >
        <LabeledField label="Name" state={state}>
          <Input value="Sample record" />
        </LabeledField>
      </FieldGroup>
    ),
  ),
  specimen('field-set/default', 'FieldSet', ['rest', 'disabled'], (state) => (
    <FieldSet disabled={state === 'disabled'}>
      <legend>Record</legend>
      <LabeledField label="Name" state={state}>
        <Input value="Sample record" />
      </LabeledField>
    </FieldSet>
  )),
  specimen('input-group/default', 'InputGroup', actionStates, (state) => (
    <LabeledField label="Search" state={state}>
      <InputGroup>
        <Input value="Sample" />
        <Button disabled={state === 'disabled'}>Go</Button>
      </InputGroup>
    </LabeledField>
  )),
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
    ),
    specimen(
      `resizable/${orientation}`,
      `Resizable and ResizeHandle / ${orientation}`,
      [...actionStates, 'closed'],
      (state) => (
        <Resizable
          orientation={orientation}
          primaryLabel="List"
          primary="Records"
          secondaryLabel="Details"
          disabled={state === 'disabled'}
          collapsed={state === 'closed'}
        >
          Record details
        </Resizable>
      ),
    ),
    specimen(
      `separator/${orientation}`,
      `Separator / ${orientation}`,
      ['rest'],
      () => (
        <div>
          Before
          <Separator orientation={orientation} />
          After
        </div>
      ),
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
            <Breadcrumbs.Link href="#variants" onClick={preventFocus}>
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
  ...displayTones.flatMap((tone) => [
    specimen(`badge/${tone}`, `Badge / ${tone}`, ['rest'], () => (
      <Badge tone={tone}>{tone}</Badge>
    )),
    specimen(`inline-alert/${tone}`, `InlineAlert / ${tone}`, ['rest'], () => (
      <InlineAlert tone={tone}>Record status</InlineAlert>
    )),
  ]),
  specimen('drag-handle/default', 'DragHandle', actionStates, (state) => (
    <DragHandleSample state={state} />
  )),
  specimen('empty-state/default', 'EmptyState', ['rest'], () => (
    <EmptyState>No records</EmptyState>
  )),
  specimen('spinner/default', 'Spinner', ['rest'], () => (
    <Spinner aria-label="Loading" />
  )),
  specimen('skeleton/default', 'Skeleton', ['rest'], () => <Skeleton />),
  specimen('progress/determinate', 'Progress / determinate', ['rest'], () => (
    <Progress aria-label="Import progress" value={60} />
  )),
  specimen(
    'progress/indeterminate',
    'Progress / indeterminate',
    ['rest'],
    () => <Progress aria-label="Import progress" />,
  ),
  specimen(
    'toast/surface',
    'Toast / persistent',
    [...interactiveStates, 'open'],
    () => (
      <Toast open persistent>
        <Toast.Title>Record saved</Toast.Title>
        <Toast.Description>Your changes are available.</Toast.Description>
        <Toast.CloseButton />
      </Toast>
    ),
  ),
  ...VALUE_FORMATS.map((format) => {
    const value = format.startsWith('boolean')
      ? true
      : format.startsWith('number')
        ? 1234.56
        : format === 'short-hash'
          ? '10957523f2958ba5'
          : format.startsWith('datetime')
            ? '2026-11-17T14:30:00Z'
            : '2026-11-17'
    return specimen(
      `value-display/${format}`,
      `ValueDisplay / ${format}`,
      ['rest'],
      () => <ValueDisplay format={format} value={value} />,
    )
  }),
  specimen(
    'field-value/boolean',
    'FieldValue / boolean',
    ['read-only'],
    (state) => (
      <LabeledField label="Published" state={state}>
        <FieldValue format="boolean-symbol" value={false} />
      </LabeledField>
    ),
  ),
  ...(['ok', 'warning', 'unknown'] as const).map((state) =>
    specimen(`status-tile/${state}`, `StatusTile / ${state}`, ['rest'], () => (
      <StatusTile
        state={state}
        label="Records"
        format="number-grouped"
        value={1250}
        detail="Last import"
      />
    )),
  ),
  specimen(
    'entry-panel/container',
    'EntryPanel and EntryPanelActions / container',
    actionStates,
    (state) => (
      <EntryPanel size="container">
        <EntryPanelActions>
          <Button disabled={state === 'disabled'}>Continue</Button>
        </EntryPanelActions>
      </EntryPanel>
    ),
  ),
  ...(['inline', 'flyout', 'expand'] as const).map((kind) =>
    specimen(
      `sidebar-group/${kind}`,
      `SidebarGroup / ${kind}`,
      [
        ...interactiveStates,
        'closed',
        'selected',
        ...(kind === 'inline' ? ['open' as const] : []),
      ],
      (state) => (
        <SidebarGroup
          label="Records"
          compact={kind !== 'inline'}
          behavior={kind === 'expand' ? 'expand' : 'flyout'}
          open={state === 'open'}
          active={state === 'selected'}
          onOpenChange={noop}
          onExpand={noop}
        >
          {() => (
            <a href="#variants" onClick={preventFocus}>
              All records
            </a>
          )}
        </SidebarGroup>
      ),
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
    ),
  ),
  ...(['results', 'loading', 'empty', 'error'] as const).map((kind) =>
    specimen(`command/${kind}`, `Command / ${kind}`, interactiveStates, () => (
      <Command
        items={kind === 'empty' ? [] : commandItems}
        loading={kind === 'loading'}
        error={kind === 'error' ? 'Could not load records.' : undefined}
        label="Find an action"
      />
    )),
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
  ),
]

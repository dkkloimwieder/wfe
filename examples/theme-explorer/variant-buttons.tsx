import {
  Accordion,
  Breadcrumbs,
  Button,
  ButtonLink,
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
import { buttonVariants } from './variant-button-matrix'
import {
  actionStates,
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
const commandItems = [
  {
    id: 'copy',
    label: 'Copy record',
    description: 'Keep the original record',
    shortcut: 'Ctrl+C',
  },
  { id: 'move', label: 'Move record', disabled: true },
]

function MenuSample(props: {
  state: State
  context?: boolean
  items?: boolean
}) {
  const Menu = props.context ? ContextMenu : DropdownMenu
  const open = () =>
    Boolean(
      props.items || ['open', 'selected', 'checked'].includes(props.state),
    )
  const triggerDisabled = () => !props.items && props.state === 'disabled'
  return (
    <Menu.Root open={open()} modal={false}>
      {props.context ? (
        <ContextMenu.Trigger disabled={triggerDisabled()}>
          Record actions
        </ContextMenu.Trigger>
      ) : (
        <DropdownMenu.Trigger disabled={triggerDisabled()}>
          Record actions
        </DropdownMenu.Trigger>
      )}
      <Menu.Portal>
        <Menu.Content onOpenAutoFocus={preventDefault}>
          <Menu.Group>
            <Menu.GroupLabel>Record</Menu.GroupLabel>
            <Menu.Item disabled={props.state === 'disabled'}>
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
    return [
      specimen(
        `${kind}/trigger`,
        `${name} / trigger`,
        actionStates,
        (state) => <MenuSample state={state} context={context} />,
      ),
      specimen(
        `${kind}/items`,
        `${name} / item states`,
        [...actionStates, 'checked', 'selected'],
        (state) => <MenuSample state={state} context={context} items />,
      ),
      specimen(
        `${kind}/content`,
        `${name} / items`,
        ['open', 'checked', 'selected'],
        (state) => <MenuSample state={state} context={context} />,
        { baseline: `${kind}/trigger` },
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
            <a href="#variants" onClick={preventDefault}>
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
            aria-disabled={state === 'disabled' ? 'true' : undefined}
            tabindex={state === 'disabled' ? -1 : undefined}
            onClick={(event) => event.preventDefault()}
          >
            All records
          </a>
        )}
      </SidebarGroup>
    ),
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
  ),
]

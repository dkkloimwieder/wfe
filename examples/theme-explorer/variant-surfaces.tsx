import { createSignal, Show } from 'solid-js'
import {
  AlertDialog,
  Badge,
  Button,
  Card,
  DashboardPanel,
  Dialog,
  EmptyState,
  EntryPanel,
  EntryPanelActions,
  InlineAlert,
  Popover,
  Progress,
  Resizable,
  Separator,
  Sheet,
  Skeleton,
  Spinner,
  StatusTile,
  Toast,
  Tooltip,
  ValueDisplay,
  VALUE_FORMATS,
  DragPreview,
  DropIndicator,
  KanbanBoard,
  KanbanColumn,
  KanbanItem,
  createSortable,
  createDragDrop,
} from '@wfe/components'
import type { DragDropScope } from '@wfe/components'
import type { ColorRole } from '@wfe/components/theme'
import { TableExample } from '../shared/controls/Recipes'
import '../shared/appearance/gallery-layout.css'
import {
  actionStates,
  interactiveStates,
  roleSpecimens,
  specimen,
} from './variant-types'

const noop = () => {}
const preventFocus = (event: Event) => event.preventDefault()
const displayTones = ['neutral', 'success', 'warning', 'error'] as const

function KanbanSample(props: {
  decoration: ColorRole
  part: 'header' | 'card'
}) {
  const sortable = createSortable({
    containers: [{ id: 'review', items: ['record'] }],
    onMove: noop,
  })
  return (
    <KanbanBoard aria-label="Sample board">
      <KanbanColumn
        id="review"
        title="Review"
        sortable={sortable}
        headerDecoration={props.part === 'header' ? props.decoration : false}
        headerDecorationAlways
      >
        <KanbanItem
          id="record"
          label="Record"
          title="Record"
          sortable={sortable}
          dragSurface="card"
          decoration={props.part === 'card' ? props.decoration : false}
          decorationAlways
        />
      </KanbanColumn>
    </KanbanBoard>
  )
}

function DragPreviewSample(props: { tone: ColorRole }) {
  const [mount, setMount] = createSignal<HTMLDivElement>()
  const scope: DragDropScope<null> = {
    ...createDragDrop<null>(),
    operation: () => ({
      source: { id: 'record', label: 'Moving record', data: null },
      target: null,
      input: 'pointer',
      point: { x: 0, y: 0 },
    }),
  }
  return (
    <div class="variant-drag-preview" ref={setMount}>
      <Show when={mount()}>
        {(target) => (
          <DragPreview scope={scope} mount={target()} tone={props.tone} />
        )}
      </Show>
    </div>
  )
}

type LiveTones = { triggerTone?: ColorRole; closeTone?: ColorRole }

function LivePopover(props: LiveTones) {
  return (
    <Popover>
      <Popover.Trigger tone={props.triggerTone}>Details</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content>
          <Popover.Title>Record details</Popover.Title>
          <Popover.Description>Review the sample record.</Popover.Description>
          <Popover.CloseButton tone={props.closeTone}>
            Close
          </Popover.CloseButton>
        </Popover.Content>
      </Popover.Portal>
    </Popover>
  )
}

function LiveTooltip(props: Pick<LiveTones, 'triggerTone'>) {
  return (
    <Tooltip openDelay={0} closeDelay={0}>
      <Tooltip.Trigger tone={props.triggerTone}>
        More information
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content>View the sample record.</Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip>
  )
}

function LiveDialog(
  props: LiveTones & { surface: typeof Dialog | typeof Sheet },
) {
  const Surface = props.surface
  return (
    <Surface.Root>
      <Surface.Trigger tone={props.triggerTone}>Details</Surface.Trigger>
      <Surface.Portal>
        <Surface.Overlay />
        <Surface.Content>
          <Surface.Title>Record details</Surface.Title>
          <Surface.Description>Review the sample record.</Surface.Description>
          <Surface.CloseButton tone={props.closeTone}>
            Close
          </Surface.CloseButton>
        </Surface.Content>
      </Surface.Portal>
    </Surface.Root>
  )
}

function LiveAlertDialog(props: LiveTones) {
  const [open, setOpen] = createSignal(false)
  return (
    <AlertDialog.Root open={open()} onOpenChange={setOpen}>
      <AlertDialog.Trigger tone={props.triggerTone}>
        Confirm
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay />
        <AlertDialog.Content>
          <AlertDialog.Title>Apply changes?</AlertDialog.Title>
          <AlertDialog.Description>
            The application owns the confirmed operation.
          </AlertDialog.Description>
          <AlertDialog.Action
            tone={props.closeTone}
            onClick={() => setOpen(false)}
          >
            Apply
          </AlertDialog.Action>
          <AlertDialog.Cancel tone={props.closeTone}>
            Keep current
          </AlertDialog.Cancel>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}

export const specimens = [
  specimen(
    'popover/trigger',
    'Popover / trigger',
    actionStates,
    (state) => (
      <Popover open={false}>
        <Popover.Trigger disabled={state === 'disabled'}>
          Details
        </Popover.Trigger>
      </Popover>
    ),
    { live: () => <LivePopover /> },
  ),
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
    { baseline: 'popover/trigger', live: () => <LivePopover /> },
  ),
  specimen(
    'tooltip/trigger',
    'Tooltip / trigger',
    actionStates,
    (state) => (
      <Tooltip open={false}>
        <Tooltip.Trigger as={Button} disabled={state === 'disabled'}>
          More information
        </Tooltip.Trigger>
      </Tooltip>
    ),
    { live: () => <LiveTooltip /> },
  ),
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
    { baseline: 'tooltip/trigger', live: () => <LiveTooltip /> },
  ),
  ...(
    [
      ['dialog', 'Dialog', Dialog],
      ['sheet', 'Sheet', Sheet],
    ] as const
  ).flatMap(([id, label, Surface]) => [
    specimen(
      `${id}/trigger`,
      `${label} / trigger`,
      actionStates,
      (state) => (
        <Surface.Root open={false}>
          <Surface.Trigger disabled={state === 'disabled'}>
            Details
          </Surface.Trigger>
        </Surface.Root>
      ),
      { live: () => <LiveDialog surface={Surface} /> },
    ),
    specimen(
      `${id}/surface`,
      `${label} / surface`,
      ['open'],
      () => (
        <Surface.Root open modal={false}>
          <Surface.Trigger>Details</Surface.Trigger>
          <Surface.Content onOpenAutoFocus={preventFocus}>
            <Surface.Title>Record details</Surface.Title>
            <Surface.Description>Review the sample record.</Surface.Description>
            <Surface.CloseButton>Close</Surface.CloseButton>
          </Surface.Content>
        </Surface.Root>
      ),
      {
        baseline: `${id}/trigger`,
        live: () => <LiveDialog surface={Surface} />,
      },
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
    {
      live: () => <LiveAlertDialog />,
    },
  ),
  specimen('card/default', 'Card', ['rest'], () => <Card>Sample record</Card>),
  specimen('dashboard-panel/default', 'DashboardPanel', ['rest'], () => (
    <DashboardPanel>Sample records</DashboardPanel>
  )),
  specimen('dashboard-panel/fill', 'DashboardPanel / fill', ['rest'], () => (
    <DashboardPanel fill>Sample records</DashboardPanel>
  )),
  ...(['horizontal', 'vertical'] as const).flatMap((orientation) => [
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
  ...displayTones.flatMap((tone) => [
    specimen(`badge/${tone}`, `Badge / ${tone}`, ['rest'], () => (
      <Badge tone={tone}>{tone}</Badge>
    )),
    specimen(`inline-alert/${tone}`, `InlineAlert / ${tone}`, ['rest'], () => (
      <InlineAlert tone={tone}>Record status</InlineAlert>
    )),
  ]),
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
  specimen('table/header', 'Table / header actions', interactiveStates, () => (
    <TableExample />
  )),
  ...roleSpecimens(
    'kanban-column/decoration',
    'KanbanColumn decoration',
    (decoration) => <KanbanSample part="header" decoration={decoration} />,
  ),
  ...roleSpecimens(
    'kanban-item/decoration',
    'KanbanItem decoration',
    (decoration) => <KanbanSample part="card" decoration={decoration} />,
  ),
  ...roleSpecimens('drag-preview/tone', 'DragPreview', (tone) => (
    <DragPreviewSample tone={tone} />
  )),
  ...roleSpecimens('drop-indicator/tone', 'DropIndicator', (tone) => (
    <div>
      Drop here
      <DropIndicator active tone={tone} />
    </div>
  )),
  ...roleSpecimens(
    'tooltip/trigger-tone',
    'Tooltip.Trigger',
    (tone) => (
      <Tooltip open={false}>
        <Tooltip.Trigger tone={tone}>Details</Tooltip.Trigger>
      </Tooltip>
    ),
    ['rest'],
    (tone) => <LiveTooltip triggerTone={tone} />,
  ),
  ...roleSpecimens(
    'popover/trigger-tone',
    'Popover.Trigger',
    (tone) => (
      <Popover open={false}>
        <Popover.Trigger tone={tone}>Details</Popover.Trigger>
      </Popover>
    ),
    ['rest'],
    (tone) => <LivePopover triggerTone={tone} />,
  ),
  ...roleSpecimens(
    'popover/close-tone',
    'Popover.CloseButton',
    (tone) => (
      <Popover open>
        <Popover.Trigger>Details</Popover.Trigger>
        <Popover.Portal>
          <Popover.Content onOpenAutoFocus={preventFocus}>
            <Popover.Title>Details</Popover.Title>
            <Popover.CloseButton tone={tone}>Close</Popover.CloseButton>
          </Popover.Content>
        </Popover.Portal>
      </Popover>
    ),
    ['open'],
    (tone) => <LivePopover closeTone={tone} />,
  ),
  ...(
    [
      ['dialog', 'Dialog', Dialog],
      ['sheet', 'Sheet', Sheet],
      ['alert-dialog', 'AlertDialog', AlertDialog],
    ] as const
  ).flatMap(([id, label, Surface]) =>
    roleSpecimens(
      `${id}/trigger-tone`,
      `${label}.Trigger`,
      (tone) => (
        <Surface.Root open={false}>
          <Surface.Trigger tone={tone}>Details</Surface.Trigger>
        </Surface.Root>
      ),
      ['rest'],
      (tone) =>
        id === 'alert-dialog' ? (
          <LiveAlertDialog triggerTone={tone} />
        ) : (
          <LiveDialog surface={Surface} triggerTone={tone} />
        ),
    ),
  ),
  ...(
    [
      ['dialog', 'Dialog', Dialog],
      ['sheet', 'Sheet', Sheet],
    ] as const
  ).flatMap(([id, label, Surface]) =>
    roleSpecimens(
      `${id}/close-tone`,
      `${label}.CloseButton`,
      (tone) => (
        <Surface.Root open modal={false}>
          <Surface.Trigger>Details</Surface.Trigger>
          <Surface.Content onOpenAutoFocus={preventFocus}>
            <Surface.Title>Details</Surface.Title>
            <Surface.CloseButton tone={tone}>Close</Surface.CloseButton>
          </Surface.Content>
        </Surface.Root>
      ),
      ['open'],
      (tone) => <LiveDialog surface={Surface} closeTone={tone} />,
    ),
  ),
  ...roleSpecimens(
    'alert-dialog/actions-tone',
    'AlertDialog actions',
    (tone) => (
      <AlertDialog.Root open={false}>
        <AlertDialog.Cancel tone={tone}>Cancel</AlertDialog.Cancel>
        <AlertDialog.Action tone={tone}>Confirm</AlertDialog.Action>
      </AlertDialog.Root>
    ),
    ['rest'],
    (tone) => <LiveAlertDialog closeTone={tone} />,
  ),
]

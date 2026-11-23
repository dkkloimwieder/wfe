import { createSignal, Show } from 'solid-js'
import {
  AlertDialog,
  Dialog,
  DragHandle,
  DragPreview,
  DropdownMenu,
  DropIndicator,
  FieldGroup,
  Input,
  KanbanBoard,
  KanbanColumn,
  KanbanItem,
  Popover,
  Sheet,
  Tooltip,
  createDragDrop,
  createDraggable,
  createSortable,
} from '@wfe/components'
import type { DragDropScope } from '@wfe/components'
import type { ColorRole } from '@wfe/components/theme'
import { roleSpecimens } from './variant-types'

const noop = () => {}

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

function DragSample(props: { tone: ColorRole }) {
  const drag = createDraggable(createDragDrop(), {
    id: 'record',
    label: 'Record',
    data: null,
  })
  return (
    <div ref={(node) => drag.ref(node)}>
      <DragHandle drag={drag} tone={props.tone} label="Move record" />
    </div>
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

const preventFocus = (event: Event) => event.preventDefault()

export const colorRoleSpecimens = [
  ...roleSpecimens(
    'field-group/decoration',
    'FieldGroup decoration',
    (decoration) => (
      <FieldGroup title="Record" decoration={decoration}>
        <Input aria-label="Name" value="Sample record" />
      </FieldGroup>
    ),
    ['hover'],
  ),
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
  ...roleSpecimens('drag-handle/tone', 'DragHandle', (tone) => (
    <DragSample tone={tone} />
  )),
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
    'dropdown-menu/trigger-tone',
    'DropdownMenu.Trigger',
    (tone) => (
      <DropdownMenu.Root open={false}>
        <DropdownMenu.Trigger tone={tone}>Actions</DropdownMenu.Trigger>
      </DropdownMenu.Root>
    ),
  ),
  ...roleSpecimens('tooltip/trigger-tone', 'Tooltip.Trigger', (tone) => (
    <Tooltip open={false}>
      <Tooltip.Trigger tone={tone}>Details</Tooltip.Trigger>
    </Tooltip>
  )),
  ...roleSpecimens('popover/trigger-tone', 'Popover.Trigger', (tone) => (
    <Popover open={false}>
      <Popover.Trigger tone={tone}>Details</Popover.Trigger>
    </Popover>
  )),
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
  ),
  ...(
    [
      ['dialog', 'Dialog', Dialog],
      ['sheet', 'Sheet', Sheet],
      ['alert-dialog', 'AlertDialog', AlertDialog],
    ] as const
  ).flatMap(([id, label, Surface]) =>
    roleSpecimens(`${id}/trigger-tone`, `${label}.Trigger`, (tone) => (
      <Surface.Root open={false}>
        <Surface.Trigger tone={tone}>Details</Surface.Trigger>
      </Surface.Root>
    )),
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
  ),
]

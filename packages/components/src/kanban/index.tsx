import { Show, omit } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { DropIndicator, DragHandle } from '../dnd/DragDropFeedback'
import { Card } from '../components/Display'
import { styledClasses } from '../internal/classes'
import { nativeEventProps, ownedElementEvents } from '../internal/events'
import { createSortableContainer, createSortableItem } from '../sortable'
import type { SortableScope, SortableId } from '../sortable'

export type KanbanBoardProps = JSX.HTMLAttributes<HTMLDivElement>
/** A scroll-contained board. The caller supplies columns and accepted item order. */
export function KanbanBoard(props: KanbanBoardProps) {
  const attributes = omit(props, 'ref', ...nativeEventProps)
  const events = ownedElementEvents(props)
  return (
    <div
      {...attributes}
      role={props.role ?? 'group'}
      class={styledClasses('ui-kanban-board', props.class)}
      ref={[props.ref, events]}
    />
  )
}

export type KanbanColumnProps = Omit<
  JSX.HTMLAttributes<HTMLElement>,
  'id' | 'title'
> & {
  id: SortableId
  title: string
  sortable: SortableScope
  /** Optional, separate horizontal sorter for column ordering. */
  columnSortable?: SortableScope
  count?: number
  actions?: JSX.Element
  disabled?: boolean
  instructionsId?: string
}
export function KanbanColumn(props: KanbanColumnProps) {
  const drop = createSortableContainer(props.sortable, {
    get id() {
      return props.id
    },
    get label() {
      return props.title
    },
    get disabled() {
      return props.disabled
    },
  })
  const attributes = omit(
    props,
    'id',
    'title',
    'sortable',
    'columnSortable',
    'count',
    'actions',
    'disabled',
    'instructionsId',
    'children',
    'ref',
    ...nativeEventProps,
  )
  const events = ownedElementEvents(props)
  return (
    <section
      {...attributes}
      class={styledClasses('ui-kanban-column', props.class)}
      aria-label={props.title}
      ref={[props.ref, events]}
    >
      <header class="ui-kanban-column-header">
        <Show
          keyed
          when={props.columnSortable}
          fallback={<h2>{props.title}</h2>}
        >
          {(scope) => (
            <ColumnHandle
              sortable={scope}
              id={props.id}
              title={props.title}
              disabled={props.disabled}
              instructionsId={props.instructionsId}
            />
          )}
        </Show>
        <Show when={props.count !== undefined}>
          <span class="ui-kanban-count" aria-label={`${props.count} items`}>
            {props.count}
          </span>
        </Show>
        <div class="ui-kanban-column-actions">{props.actions}</div>
      </header>
      <div
        class="ui-kanban-items"
        ref={drop.ref}
        data-drop-target={drop.targeted() || undefined}
      >
        {props.children}
        <DropIndicator
          active={
            props.sortable.preview()?.destination.containerId === props.id &&
            props.sortable.preview()?.destination.beforeId === null
          }
        />
      </div>
    </section>
  )
}
function ColumnHandle(props: {
  sortable: SortableScope
  id: SortableId
  title: string
  disabled?: boolean
  instructionsId?: string
}) {
  const registration = createSortableItem(props.sortable, {
    get id() {
      return props.id
    },
    get label() {
      return props.title
    },
    get disabled() {
      return props.disabled
    },
  })
  return (
    <div class="ui-kanban-column-heading" ref={registration.ref}>
      <DragHandle
        drag={registration}
        label={`Move column ${props.title}`}
        aria-describedby={props.instructionsId}
        disabled={props.disabled}
      />
      <h2>{props.title}</h2>
    </div>
  )
}

export type KanbanItemProps = Omit<JSX.HTMLAttributes<HTMLDivElement>, 'id'> & {
  id: SortableId
  label: string
  sortable: SortableScope
  disabled?: boolean
  actions?: JSX.Element
  instructionsId?: string
}
/** Uses the shared Card. Interactive content remains separate from the drag handle. */
export function KanbanItem(props: KanbanItemProps) {
  const registration = createSortableItem(props.sortable, {
    get id() {
      return props.id
    },
    get label() {
      return props.label
    },
    get disabled() {
      return props.disabled
    },
  })
  const attributes = omit(
    props,
    'id',
    'label',
    'sortable',
    'disabled',
    'actions',
    'instructionsId',
    'children',
    'ref',
  )
  return (
    <>
      <DropIndicator
        active={props.sortable.preview()?.destination.beforeId === props.id}
      />
      <Card
        {...attributes}
        class={styledClasses('ui-kanban-item', props.class)}
        ref={[props.ref, registration.ref]}
        data-dragging={registration.dragging() || undefined}
      >
        <div class="ui-kanban-item-actions">
          <DragHandle
            drag={registration}
            label={`Move ${props.label}`}
            aria-describedby={props.instructionsId}
            disabled={props.disabled}
          />
          {props.actions}
        </div>
        {props.children}
      </Card>
    </>
  )
}

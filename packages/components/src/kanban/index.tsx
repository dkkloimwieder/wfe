import { Show, createEffect, omit } from 'solid-js'
import type { JSX } from '@solidjs/web'
import type { DecorationColor } from '../theme/appearance'
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
  frameless?: boolean
  headerDecoration?: boolean | DecorationColor
  headerDecorationHover?: boolean
  headerDecorationFocusWithin?: boolean
  headerDecorationAlways?: boolean
  headerDecorationActive?: boolean
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
    'frameless',
    'headerDecoration',
    'headerDecorationHover',
    'headerDecorationFocusWithin',
    'headerDecorationAlways',
    'headerDecorationActive',
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
      data-frameless={props.frameless || undefined}
      ref={[props.ref, events]}
    >
      <header
        class="ui-kanban-column-header"
        data-ui-section-decoration={
          props.headerDecoration === true
            ? 'primary'
            : props.headerDecoration || 'none'
        }
        data-ui-section-hover={
          props.headerDecorationHover !== false ? '' : undefined
        }
        data-ui-section-focus={
          props.headerDecorationFocusWithin !== false ? '' : undefined
        }
        data-ui-section-always={props.headerDecorationAlways ? '' : undefined}
        data-ui-section-active={props.headerDecorationActive ? '' : undefined}
      >
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

export type KanbanItemProps = Omit<
  JSX.HTMLAttributes<HTMLDivElement>,
  'id' | 'title'
> & {
  id: SortableId
  label: string
  title?: JSX.Element
  sortable: SortableScope
  disabled?: boolean
  dragSurface?: 'handle' | 'card'
  decoration?: boolean | DecorationColor
  decorationHover?: boolean
  decorationFocusWithin?: boolean
  decorationAlways?: boolean
  decorationActive?: boolean
  actions?: JSX.Element
  instructionsId?: string
}
/** Shared Card with an optional keyboard-focusable, whole-card drag surface. */
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
  createEffect(
    () => props.dragSurface,
    (surface) => {
      if (surface === 'card') registration.handleRef(undefined)
    },
  )
  const attributes = omit(
    props,
    'id',
    'label',
    'title',
    'dragSurface',
    'decoration',
    'decorationHover',
    'decorationFocusWithin',
    'decorationAlways',
    'decorationActive',
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
        data-drag-surface={props.dragSurface ?? 'handle'}
        role={
          props.role ?? (props.dragSurface === 'card' ? 'group' : undefined)
        }
        tabindex={
          props.tabindex ??
          (props.dragSurface === 'card' && !props.disabled ? 0 : undefined)
        }
        aria-label={
          props['aria-label'] ??
          (props.dragSurface === 'card' ? props.label : undefined)
        }
        aria-roledescription={
          props['aria-roledescription'] ??
          (props.dragSurface === 'card' ? 'draggable card' : undefined)
        }
        aria-disabled={props.disabled ? 'true' : undefined}
        aria-describedby={
          [
            props['aria-describedby'],
            props.dragSurface === 'card' ? props.instructionsId : undefined,
          ]
            .filter(Boolean)
            .join(' ') || undefined
        }
        data-ui-section-decoration={
          props.decoration === true ? 'primary' : props.decoration || 'none'
        }
        data-ui-section-hover={props.decorationHover !== false ? '' : undefined}
        data-ui-section-focus={
          props.decorationFocusWithin !== false ? '' : undefined
        }
        data-ui-section-always={props.decorationAlways ? '' : undefined}
        data-ui-section-active={props.decorationActive ? '' : undefined}
      >
        <Show when={props.title}>
          <h3 class="ui-kanban-item-title" data-ui-text="system">
            {props.title}
          </h3>
        </Show>
        <Show when={props.dragSurface !== 'card' || props.actions}>
          <div class="ui-kanban-item-actions">
            <Show when={props.dragSurface !== 'card'}>
              <DragHandle
                drag={registration}
                label={`Move ${props.label}`}
                aria-describedby={props.instructionsId}
                disabled={props.disabled}
              />
            </Show>
            {props.actions}
          </div>
        </Show>
        {props.children}
      </Card>
    </>
  )
}

# Drag and drop components

The drag and drop API supports generic targets, sortable lists, and boards. These components share one engine, and applications decide which moves to accept.

Contents

- [Drag and drop](#drag-and-drop)
- [Drag-and-drop engine](#drag-and-drop-engine)

## Drag and drop

Drag and drop registers sources and targets and requests moves between them.

### Import

Import generic dragging from `@wfe/components/dnd`, controlled sorting from `@wfe/components/sortable`, and board components from `@wfe/components/kanban`.

### Example

```jsx
import {
  createDragDrop,
  createDraggable,
  createDroppable,
  DragHandle,
} from '@wfe/components/dnd'

export function MoveRecord(props) {
  const scope = createDragDrop({ onDrop: props.onDrop })
  const source = createDraggable(scope, {
    id: 'record',
    label: 'Record',
    data: null,
  })
  const target = createDroppable(scope, {
    id: 'archive',
    label: 'Archive',
    data: null,
  })
  return (
    <>
      <div ref={source.ref}>
        <DragHandle drag={source} label="Move record" />
      </div>
      <div ref={target.ref}>Archive</div>
    </>
  )
}
```

### Behavior and options

#### Generic scopes

Call `createDragDrop` inside a Solid owner. Register sources with
`createDraggable` and destinations with `createDroppable`. Each registration
receives an application ID, an accessible label, and arbitrary application
data. Attach the returned `ref` to the element. Attach a source's `handleRef`
to its separate handle, or use `DragHandle` with that registration.
Keep editable content and ordinary actions outside the handle.

Source IDs must be unique within the source registry. Destination IDs must
be unique within the destination registry. The two registries are separate.
Use stable primitive IDs. Supply changing options through reactive getters.
The scope's `disabled` option stops movement. Its `revision` token lets the
application invalidate a gesture when relevant data or layout changes.
Droppable `accepts` callbacks decide whether that source can target them.

`operation` exposes the current source, optional target, input method and
pointer coordinates. The scope emits start, over, drop and cancel callbacks.
`subscribe` observes those lifecycle events and returns an unsubscribe
function. Dispose subscriptions with their owner. Registrations and the
scope dispose their engine resources with their Solid owner.

A completed drop emits one request. Cancellation emits none. If a callback throws, the error propagates and gesture cleanup still runs.

`requestDrop(sourceId, targetId)` is the non-drag alternative. Use it from
buttons or menu items. It validates the same registered source and target.
Its boolean result reports whether a valid request was dispatched, not
whether the application accepted or persisted the request.

#### Keyboard and presentation

Space or Enter picks up a focused handle. Arrow keys select an eligible
target. Space or Enter requests the drop. Escape cancels. Generic scopes
use spatial navigation by default. Supply `navigate` when application
layout requires a different target order. Sortable lists use their accepted
order and orientation. Existing table column keyboard commands remain
immediate moves, alongside the existing move menu.

During an active pointer drag or Gantt resize, a transparent interaction layer
blocks unrelated hover, clicks, wheel input, and keyboard actions. Escape cancels
only the gesture. Edge scrolling and drop targets remain active beneath the layer.
Drop, cancellation, and disposal restore normal interaction. Keyboard drags keep
the controls described above.

`DragDropFeedback` supplies an optional live region and keyboard instructions.
Pass `instructionsId` and connect a handle through `aria-describedby`.
Use `message` to provide localized lifecycle messages. Its default drop
message says that a move was requested. It does not announce acceptance.

`DragPreview` renders a pointer preview in a portal. By default it renders
only the source label. It never clones the source element or copies form
controls and IDs. Its optional child callback receives a reactive operation
accessor. A custom renderer must supply display-only content, with no reused
source nodes, IDs, inputs, focus stops, or application field subscriptions.
The preview wrapper is inert, hidden from assistive technology, and excluded
from pointer hit testing. It follows the nearest shared portal/theme scope.
`mount` can supply a different portal root. A transformed ancestor can still
establish a containing block, so choose an appropriate mount for such layouts.

The preview does not render for keyboard gestures.
`DropIndicator` supplies a caller-positioned insertion marker. Preview and
indicator accept neutral, primary, secondary, and accent theme roles. `DragHandle`
uses the shared Button and its existing appearance and decoration options.
The presentation helpers do not animate, including under reduced motion.

#### Controlled sorting

`createSortable` receives accepted containers with ordered item IDs and an
`onMove` callback. Container IDs must be unique, and each item ID must occur
once across all containers. Register list roots with `createSortableContainer`
and items with `createSortableItem`. The returned item registration provides
both an element ref and a separate handle ref.

The final move identifies the item, its source container and index, and a
destination container and `beforeId`. A null `beforeId` means the end of the
destination. `moveSortableItem` is an immutable helper that applies a valid
request to accepted arrays. It leaves arrays unchanged when IDs or the recorded
source position no longer match. The application can use its own update logic
instead.

`preview` describes a temporary insertion destination. Hovering does not
reorder application arrays or move existing DOM nodes optimistically.
`requestMove` provides the same final-request contract to menus and buttons.
`canMove` restricts candidate moves before dispatch. A changed accepted
membership/order, disabled scope, removed source, or invalidated target
cancels the active gesture. A rejected request leaves accepted order intact.

#### Board composition

`KanbanBoard`, `KanbanColumn`, and `KanbanItem` provide layout, shared Card
presentation, handles, and indicators. The caller supplies titles, records,
counts, actions, empty states and accepted item order. A separate horizontal
sorter can control column order. Card content and application actions remain
ordinary components. The board does not define issue status or persistence.

`autoScroll` controls edge scrolling independently of sorting orientation. It
accepts `"both"` (default), `"horizontal"`, `"vertical"`, or `false`, on both
`createDragDrop` and `createSortable`. Changing it cancels the active drag.
Table column scopes use horizontal scrolling, so column dragging does not trigger
vertical edge scrolling. Board scopes keep both axes.

#### Board presentation options

`KanbanItem` keeps its separate drag handle by default. Set `dragSurface="card"`
to make the card itself a focusable drag surface. It remains a group, not a
button: nested buttons, links and inputs keep their own pointer and keyboard
behavior. Space or Enter on the card picks it up. Supply `instructionsId`
for the shared keyboard instructions. `title` renders a plain heading before
`actions` and the card body. The application owns editing and action behavior.

Cards accept the shared `decoration` color roles (`primary`, `secondary`,
`neutral`, `true` for primary, or `false` to disable). `decorationHover` and
`decorationFocusWithin` default to true. `decorationAlways` keeps decoration
visible. `decorationActive` lets the application keep it visible during editing
or another selected state. These reuse the Theme's decoration geometry.

Columns accept the same options with the `headerDecoration` prefix, including
`headerDecorationAlways`. `frameless` removes the column frame and surface so
its header and cards can sit on the surrounding canvas. Stage colors and the
meaning of each stage remain application choices.

Read about the [shared engine](#drag-and-drop-engine) for adapter and vendor ownership.

### Application ownership

Supply source and target IDs, labels, data, accepted order, and drop rules. Own record updates, permissions, asynchronous requests, and persistence.

### Gallery

Open `?gallery=drag-and-drop` for generic targets and sorting. Open `?gallery=kanban` for a board with card actions and move menus.

## Drag-and-drop engine

Generic drop targets, sortable lists, table columns, and Kanban share one engine.

### Import

The Solid adapter exposes the [public drag and drop API](#drag-and-drop). It keeps engine types inside the package.

### Behavior and options

The adapter creates managers and registrations after mount. Their Solid owners dispose observers, listeners, subscriptions, and managers. The adapter exposes the operation state needed for rendering.

The owned adapter supplies keyboard navigation, announcements, and a display-only preview. Sortable hover computes a temporary destination. A completed drop requests one move, and the application supplies the accepted order.

The captured dnd-kit tree retains upstream Sortable for source comparison. The active controlled sorter uses the generic engine. It excludes the upstream clone feedback and optimistic ordering plugins. Capture build rules lower standard decorators inside the dnd-kit TypeScript tree.

The [vendor capture](../packages/components/src/vendor/dnd-kit/README.md) records the pinned source, MIT license, hashes, and repairs. Follow the [vendor replay procedure](vendor-repair-replay.md#drag-and-drop-capture-compilation) when the capture changes.

### Application ownership

Applications keep their records, order, permissions, and persistence.

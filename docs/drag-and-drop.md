# Drag and drop

The unreleased drag and drop APIs are separate public subpaths of
`@wfe/components`. Import generic dragging from `@wfe/components/dnd`,
controlled ordering from `@wfe/components/sortable`, and board presentation
from `@wfe/components/kanban`. Load the shared component stylesheet once.
These APIs are not part of the last tagged release, v0.0.8.

## Generic scopes

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

A drop is one request. WFE does not accept it on the application's behalf,
change records, send a request, or interpret application permissions.
An application can accept a drop by updating its state, reject it by leaving
state unchanged, or run its own asynchronous workflow. Cancellation does
not emit a drop request. Exceptions still propagate. Cleanup of a gesture
does not undo changes the application already made before throwing.

`requestDrop(sourceId, targetId)` is the non-drag alternative. Use it from
buttons or menu items. It validates the same registered source and target.
Its boolean result reports whether a valid request was dispatched, not
whether the application accepted or persisted the request.

## Keyboard and presentation

Space or Enter picks up a focused handle. Arrow keys select an eligible
target. Space or Enter requests the drop. Escape cancels. Generic scopes
use spatial navigation by default. Supply `navigate` when application
layout requires a different target order. Sortable lists use their accepted
order and orientation. Existing table column keyboard commands remain
immediate moves, alongside the existing move menu.

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
indicator accept neutral, primary and secondary theme roles. `DragHandle`
uses the shared Button and its existing appearance and decoration options.
The presentation helpers do not animate, including under reduced motion.

## Controlled sorting

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

## Board composition and examples

`KanbanBoard`, `KanbanColumn`, and `KanbanItem` provide layout, shared Card
presentation, handles, and indicators. The caller supplies titles, records,
counts, actions, empty states and accepted item order. A separate horizontal
sorter can control column order. Card content and application actions remain
ordinary components. The board does not define issue status or persistence.

The gallery has separate Drag and drop and Issue board entries. The
[generic example](../examples/shared/drag-and-drop/DragExample.tsx) demonstrates
arbitrary targets, a controlled list, disabled state, request rejection,
feedback and menu alternatives. The
[board example](../examples/shared/drag-and-drop/BoardExample.tsx) composes columns,
cards, editing and move menus with local application state. Those choices
are examples, not application requirements.

The shared hydration fixture renders generic registrations and a small
controlled board. Its review checks adoption of server nodes, hydrated menu
requests and keyboard cancellation. These are test definitions. Consult the
current run artifacts for execution evidence. The
[engine record](drag-and-drop-engine.md) describes source ownership,
compiler integration and retained repairs.

`autoScroll` controls edge scrolling independently of sorting orientation. It
accepts `"both"` (default), `"horizontal"`, `"vertical"`, or `false`, on both
`createDragDrop` and `createSortable`. Changing it cancels the active drag.
Table column scopes use horizontal scrolling, so column dragging does not trigger
vertical edge scrolling. Board scopes keep both axes.

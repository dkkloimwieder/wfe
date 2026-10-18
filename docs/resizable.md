# Resizable panes

`Resizable` divides a container into two panes with a movable separator.
It retains both panes and their contents during resizing and orientation changes.
Applications own content, data, height, and size persistence.
The root export and `@wfe/components/resizable` expose the same components and types.
Import `@wfe/components/styles.css` once for shared styles.

## Two panes

The `primary` slot supplies the pane whose size you control. Children supply the other pane.
The required `primaryLabel` names that pane and its separator. An optional `secondaryLabel` names the other pane.
`orientation="horizontal"` places panes beside each other. `orientation="vertical"` stacks them.
Assign a definite height for a vertical layout.
The shared gutter stays inside the layout and does not cover adjacent inputs.
Touch devices receive a wider gutter.

Size is a percentage of the space available to both panes, excluding the gutter.
Use `defaultSize` for local state. It defaults to 30.
Use `size` and `onSizeChange` for application control. The callback requests a change that the application can reject.
Initial rendering and application prop changes do not request changes.
Keep the control mode stable for the component lifetime.
Use `minSize` and `maxSize` for limits. They default to 10 and 90.
Bounds must be finite and strictly between 0 and 100. The selected size must stay within them.
`step` defaults to one percentage point and must be finite and positive.
Double-click the divider or press Enter to close and reopen the primary pane.
Reopening retains the last open size. Before the first resize, this is the supplied size or the default.
The closed pane stays mounted and hidden. The divider remains visible and reports size zero.
Arrow keys, Home, End, and dragging do not resize a closed pane. Enter reopens it.
Use `collapsed`, `defaultCollapsed`, and `onCollapsedChange` to control collapse separately from the expanded size.
A controlled callback can reject collapse without a size request.
An application size update while closed supplies the size for the next reopening.
The component accepts native div attributes, structured classes, events, refs, and an object `style`.

```tsx
import { createSignal } from 'solid-js'
import { Input } from '@wfe/components'
import { Resizable, ResizeHandle } from '@wfe/components/resizable'

export function Workspace() {
  const [size, setSize] = createSignal(30)
  return (
    <Resizable
      primaryLabel="Navigation"
      secondaryLabel="Content"
      primary={<Input aria-label="Navigation draft" />}
      size={size()}
      onSizeChange={setSize}
      style={{ height: '20rem' }}
    >
      <Input aria-label="Content draft" />
    </Resizable>
  )
}

const unnamed = (
  // @ts-expect-error A separator requires an accessible name.
  <ResizeHandle
    value={30}
    onValueChange={() => {}}
    aria-controls="pane"
    getAvailableSize={() => 600}
  />
)
void unnamed
```

## Interaction and shared handle

Focus the separator with Tab. Arrow keys move it along its physical axis, including in RTL layouts.
Shift increases the keyboard step tenfold. Home and End select the configured limits.
Escape, pointer cancellation, lost capture, window blur, and document hiding end a drag at its last accepted size.
Bounds, orientation, disabled state, geometry, and unexpected application size changes also cancel an active drag.
Rejected requests end a drag before its next movement. Accepted size echoes keep it active.
Disposal releases capture and removes the gesture listeners.

`ResizeHandle` supplies the same behavior for an existing layout, such as TableWorkspace.
Its optional `onToggle` handles double-click and Enter. Owners supply `collapsed` and effective `value={0}` while closed.
Owners keep the expanded size separately and control the pane visibility.
The pointer must move more than three pixels to resize. Small click movements do not request a size.
A genuine drag suppresses the corresponding double-click toggle.
It uses separator orientation: a vertical separator adjusts widths, and a horizontal separator adjusts heights.
`reverse` identifies a pane after the separator in logical layout order. The handle accounts for RTL direction.
Supply an accessible name, `aria-controls`, a controlled percentage `value`, and `onValueChange`.
`getAvailableSize` returns the combined visual extent of both panes along that axis, excluding the gutter.
Requests clamp to `min` and `max`. The handle also reports existing measured sizes outside those request bounds.
Caller handlers can cancel resize requests with `preventDefault()`.
The handle uses the shared focus ring and has no storage or network behavior.
Its semantics and axis keys follow the [WAI separator guidance](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/).

## Table controls

TableWorkspace uses the same handle for left, right, and top controls on desktop.
The initial layout keeps its existing CSS size until the application or user supplies a percentage.
Use `controlsSize`, `defaultControlsSize`, and `onControlsSizeChange` to manage that percentage.
Explicit sizes stay between 10 and 90. `controlsResizable={false}` disables user resizing.
ReadOnlyTable forwards these props. Generated Table bindings expose controlled size and resizing availability.
The measurement excludes the merged header and the gutter.
Collapsed desktop controls retain the thin separator for reopening with double-click or Enter.
The existing controls button and divider share the same collapsed state and retain the last open size.
The mobile drawer keeps its original width and does not expose a resize handle.
The controls button receives focus before a focused separator becomes hidden on mobile or when resizing is disabled.
The table, controls, scroll container, and drafts keep their existing nodes.

The component preview route `?resizable=1` demonstrates both layouts with the approved appearance.

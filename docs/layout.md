# Layout

Layout components arrange panels, divide space, and show or hide content. The application supplies the content for each region.

Contents

- [Dashboard layout](#dashboard-layout)
- [Resizable panes](#resizable-panes)
- [Accordion](#accordion)
- [Collapsible](#collapsible)
- [EntryPanel](#entrypanel)

## Dashboard layout

DashboardShell arranges application content in header, navigation, main, and footer regions.

### Import

Import `DashboardShell`, `DashboardPanel`, and `DashboardGrid` from `@wfe/components/layout`. Import the shared stylesheet once.

### Example

```tsx
import { Button } from '@wfe/components'
import {
  DashboardGrid,
  DashboardPanel,
  DashboardShell,
} from '@wfe/components/layout'
import '@wfe/components/styles.css'

export function Workspace() {
  return (
    <DashboardShell
      style={{ height: '100dvh' }}
      header={<h1>Workspace</h1>}
      navigation={({ close }) => <Button onClick={close}>Records</Button>}
      mainLabel="Workspace content"
    >
      <DashboardGrid>
        <DashboardPanel>
          <h2>First panel</h2>
        </DashboardPanel>
        <DashboardPanel>
          <h2>Second panel</h2>
        </DashboardPanel>
      </DashboardGrid>
    </DashboardShell>
  )
}
```

### Behavior and options

#### Navigation

The `navigation` and `context` callbacks receive `close()`, `compact()`, and `mobile()`. Omit navigation for one full-width main region. `mobile()` reports drawer mode. `compact()` stays false in the drawer so labels remain visible.

Primary navigation moves to a drawer below 48rem. Context navigation moves below 64rem. The shell considers both its container width and viewport width. If ResizeObserver is unavailable or the shell has no measurable width, viewport rules apply.

Only one drawer opens at a time. Escape or the close button returns focus to its toggle. A link can call the drawer's `close()` after navigation. Changing width retains the menu and its content.

Use `navigationLabel`, `toggleLabel`, and `closeLabel` for accessible text. Use `mainAs="section"` in an existing main region. The header and optional footer span all columns. Pass `footer={null}` to keep an empty footer band.

#### Scrolling and size

Give the shell a definite height. The default `scroll="main"` scrolls the main region. Use `scroll="content"` when a child owns scrolling. This mode removes the main padding. Set `fill` on a panel that needs the remaining height.

DashboardPanel uses the shared Card styles. DashboardGrid wraps panels as width decreases. The main area uses `--ui-layout-inset` for its inset and panel gap. Navigation and context rails use `--ui-region-gap` for compact spacing. Direct Collapsible sections can run edge to edge.

Use `--ui-navigation-width`, `--ui-context-width`, and `--ui-panel-min-width` to change widths. Keep virtual row dimensions aligned with the density that supplies their geometry. The shell supplies a portal root. An explicit portal `mount` overrides automatic placement.

#### Compact sidebar

Pass `navigationCollapsed` and `onNavigationCollapsedChange` to control desktop collapse. The divider control appears when the application supplies the callback. Use `--ui-navigation-rail-width` to change the compact width.

SidebarGroup uses CollapsibleSection for its summary and accepts `compact` from the navigation callback. In `behavior="flyout"`, its compact control opens an adjacent menu. In `behavior="expand"`, it requests an open group and calls `onExpand`. A group without an icon uses the first character of its label when compact.

Use [SidebarContextSwitcher](navigation.md#sidebar-context-switcher) for sibling and parent navigation. Use [EntryPanel](#entrypanel) for a centered entry screen. For navigation from typed descriptions, see the [ShellView contract](../packages/shell/README.md).

### Application ownership

Supply region content, height, links, permissions, records, and requests. Own routing, accepted navigation state, and any persistence. For table results, assign a bounded height to the scroller.

### Gallery

Open `?gallery=dashboard-layout` for desktop and narrow layouts. Open `?gallery=sidebar-links` or `?gallery=contexts` for navigation.

## Resizable panes

Resizable divides a container into two panes with a movable separator.

### Import

Import `Resizable` and `ResizeHandle` from `@wfe/components/resizable` or the package root.

### Example

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

### Behavior and options

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

#### Interaction and shared handle

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

#### Table controls

TableWorkspace uses the same handle for left, right, and top controls on desktop.
The initial layout keeps its existing CSS size until the application or user supplies a percentage.
Use `controlsSize`, `defaultControlsSize`, and `onControlsSizeChange` to manage that percentage.
Explicit sizes stay between 10 and 90. Set `controlsResizable` to enable user resizing. The workspace defaults to fixed controls.
ReadOnlyTable forwards these props. Generated Table bindings expose controlled size and resizing availability.
The measurement excludes the merged header and the gutter.
Collapsed desktop controls retain the thin separator for reopening with double-click or Enter.
The existing controls button and divider share the same collapsed state and retain the last open size.
The narrow drawer uses its own width and hides the resize handle.
The controls button receives focus before a focused separator becomes hidden on mobile or when resizing is disabled.
The table, controls, scroll container, and drafts keep their existing nodes.

### Application ownership

Supply pane content and a definite height for vertical layouts. Own persistence and the accepted size or collapse state when controlled.

### Gallery

Open `?gallery=resizable` for split panes and a resizable table control pane.

## Accordion

Accordion groups related sections that open and close.

### Import

Import `Accordion` from `@wfe/components/accordion` or the package root.

### Example

```tsx
import { createSignal } from 'solid-js'
import { Accordion, Field, Input, Label } from '@wfe/components'

export function ProfileSections() {
  const [open, setOpen] = createSignal<string[]>(['contact'])
  return (
    <Accordion value={open()} onValueChange={setOpen}>
      <Accordion.Item value="contact" summary="Contact">
        <Field controlId="profile-name">
          <Label>Name</Label>
          <Input id="profile-name" defaultValue="Ada" />
        </Field>
      </Accordion.Item>
      <Accordion.Item value="preferences" summary="Preferences">
        Application preferences
      </Accordion.Item>
    </Accordion>
  )
}

const independent = (
  <Accordion.Root multiple defaultValue={['contact', 'preferences']}>
    <Accordion.Item value="contact" summary="Contact">
      Contact content
    </Accordion.Item>
    <Accordion.Item value="preferences" summary="Preferences">
      Preferences content
    </Accordion.Item>
  </Accordion.Root>
)
const invalidItem = (
  // @ts-expect-error The group owns the item open state.
  <Accordion.Item value="contact" summary="Contact" open>
    Content
  </Accordion.Item>
)
// @ts-expect-error Selected values use an array in both group modes.
const invalidSelection = <Accordion value="contact" />
void independent
void invalidItem
void invalidSelection
```

### Behavior and options

Use `Accordion.Root` or `Accordion` for the group. Use `Accordion.Item` for each section.
Supply each item with a unique, nonempty `value`, a `summary`, and content.
The summary keeps native disclosure semantics. The group does not add a separate accessibility role.
Use headings inside summaries when the page structure needs them.

The default group allows one open section. Set `multiple` to allow several open sections.
Use `defaultValue` for local state, or `value` and `onValueChange` for application control.
Both values contain arrays of item values. An empty array closes all sections.
The callback requests a change. The application can accept or reject that request.
Initial rendering and application prop changes do not call the callback.
Keep the control mode stable for the group lifetime.
The component rejects duplicate or empty selected values and several selected values in a single-open group.
If you change `multiple` to false, first reduce the selected values to one or none.

Children stay mounted while a section closes. Draft values and DOM nodes remain in place.
Closing a section with focus inside its content returns focus to its summary.
Focus outside the section stays unchanged.
Removing an item does not clear its selected value. Applications own selection across changes to their item list.
Native `toggle` events can combine several property writes in one task.

Enter and Space open or close the focused summary.
Up and down arrows move between visible summaries in the same group and wrap at either end.
Home and End move to the first and last summaries. These keys move focus without opening sections.
Nested groups keep their own navigation. Inputs and buttons inside sections retain their normal keys.
Caller event handlers can cancel an action with `preventDefault()`.
The root accepts native div attributes, structured classes, events, and refs.
Items accept the native Collapsible attributes, events, refs, and `contentClass`.
The group owns each item's open state.

### Application ownership

Supply stable item values and section content. Own the field values, validation, requests, and persistence. If the application controls selection, supply the accepted array when items change.

### Gallery

Open `?gallery=accordion` for grouped sections with retained form drafts.

## Collapsible

Collapsible opens and closes content through a native `details` element.

### Import

Import `Collapsible` from `@wfe/components/collapsible`. Import `CollapsibleSection` from `@wfe/components`.

### Example

```tsx
import { createSignal } from 'solid-js'
import { Collapsible } from '@wfe/components/collapsible'

export function Details() {
  const [open, setOpen] = createSignal(false)
  return (
    <Collapsible summary="Details" open={open()} onOpenChange={setOpen}>
      The application supplies this content.
    </Collapsible>
  )
}

const grouped = (
  // @ts-expect-error Native exclusive groups are outside this component contract.
  <Collapsible summary="Grouped" name="group">
    Content
  </Collapsible>
)
void grouped
```

### Behavior and options

The summary uses the shared triangular indicator. `indicatorPlacement` accepts `start` (the default) or `end`.
The Sketchy theme adds gray fill and blue dotted decoration on hover or keyboard focus. The triangle keeps its size.
The `summary` prop supplies its heading. Children remain mounted while the disclosure closes, so inputs retain local values.
`CollapsibleSection` wraps the disclosure with a title, an optional icon and count, and an end indicator. Sidebar groups and table control sections share it.

Use `defaultOpen` for an uncontrolled disclosure. Its native `open` property can reveal a table filter before focus moves to an invalid input.
Use `open` and `onOpenChange` when the application controls the disclosure. Keep the same mode for its lifetime.
The callback requests a change. The application can accept or reject that request.
Initialization and application changes do not call the callback.
Native toggle observations can combine several property changes within one task.

The summary retains native Enter and Space behavior. Buttons and links inside the summary retain their own actions.
The root accepts native attributes, classes, event handlers, and refs.
Native exclusive groups through `name` are excluded because each component controls its own opening. Use `contentClass` to style the content container.
When an application closes a disclosure with focus inside its content, focus returns to the summary.
Focus outside the disclosure stays unchanged.

### Application ownership

Supply the summary and content. In controlled mode, accept or reject changes to the open state.

### Gallery

Open `?gallery=collapsible` for disclosures with content that stays mounted.

## EntryPanel

EntryPanel centers a small surface for an entry screen.

### Import

Import `EntryPanel` and `EntryPanelActions` from `@wfe/components/layout`.

### Example

```tsx
import { Theme, Field, Label, Input, Button } from '@wfe/components'
import { EntryPanel, EntryPanelActions } from '@wfe/components/layout'
import '@wfe/components/styles.css'

;<Theme>
  <main>
    <EntryPanel role="group" aria-labelledby="welcome">
      <form>
        <h1 id="welcome">Welcome</h1>
        <Field>
          <Label>Name</Label>
          <Input name="name" />
        </Field>
        <EntryPanelActions>
          <Button type="submit">Continue</Button>
          <Button type="reset">Clear</Button>
        </EntryPanelActions>
      </form>
    </EntryPanel>
  </main>
</Theme>
```

### Behavior and options

The default `size="viewport"` fills the current viewport height.
Use `size="container"` inside a parent with a definite height.
The panel scrolls when the content exceeds the available height.
Its surface retains safe edge spacing on narrow screens.

The surface fits its content up to 30rem by default.
Set `--ui-entry-panel-width` on the component to change this limit.
The limit does not set field widths.
Native attributes, classes, styles, events, and refs apply to the outer container.

The panel uses the shared surface, spacing, border, and primary colors.
The surrounding canvas uses the shared neutral dotted background.
Its dotted frame uses the primary color, which is blue in the Sketchy theme.
Decoration remains behind an opaque surface and cannot receive pointer events.
Forced-color mode removes the decorative frame.
The component adds no shadow.

`EntryPanelActions` gives each direct child equal width across the available content width, with the shared gap between actions.
Use it for the panel buttons without changing their submit, reset, or callback behavior.

The frame uses the same random rotation and independent two-axis trapezoid distortion as buttons and sidebar links.
The shared theme selects geometry when the panel mounts and when the pointer enters its surface.
Only the decorative backing transforms. Fields, text, and buttons keep their normal layout.

### Application ownership

Supply the landmark, heading, form, buttons, and accessible names. Own focus policy, validation, submission, and navigation.

### Gallery

Open `?gallery=entry` for a centered form.

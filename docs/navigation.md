# Navigation

These components help users move between views, find actions, and change context. The application supplies the available destinations and actions.

Contents

- [Tabs](#tabs)
- [Breadcrumbs](#breadcrumbs)
- [Sidebar context switcher](#sidebar-context-switcher)
- [Commands and search](#commands-and-search)
- [Context menus](#context-menus)

## Tabs

Tabs shows one related section at a time.

### Import

Import `Tabs` from `@wfe/components/tabs` or the package root.

### Example

```tsx
import { Tabs } from '@wfe/components/tabs'

export function RecordSections() {
  return (
    <Tabs defaultValue="details" panelMount="retain">
      <Tabs.List aria-label="Record sections">
        <Tabs.Trigger value="details">Details</Tabs.Trigger>
        <Tabs.Trigger value="notes">Notes</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="details">Application record details</Tabs.Content>
      <Tabs.Content value="notes">Application record notes</Tabs.Content>
    </Tabs>
  )
}
```

### Behavior and options

Supply `value` for application control, or `defaultValue` for local selection.
The explicit initial value keeps server output and browser attachment consistent.
Keep the control mode stable for the component lifetime.
`onValueChange` requests selection. The application can reject the request.
Application prop changes do not request selection.
Use unique, nonempty values for triggers and their matching panels.
The root accepts an ID. Triggers and panels generate their associated IDs, so per-part ID overrides are excluded.

`panelMount="retain"` is the default. All panels mount initially, and inactive panels stay hidden and inert.
Inert content cannot receive keyboard focus. Local drafts and component state survive selection changes.
`panelMount="active"` mounts only the selected content and disposes it immediately after selection changes.
Use this policy when inactive work must stop. Applications own persistence across disposal.
If focus remains inside a closing panel, Tabs moves focus to the selected trigger.
Focus outside the panels stays unchanged.

Arrow keys move between enabled triggers. Horizontal lists support left and right arrows and respect the root `dir` configuration.
Vertical lists support up and down arrows. Home and End move to the first and last enabled triggers.
`activationMode="automatic"` selects during keyboard navigation.
`activationMode="manual"` requires Enter or Space after navigation.
Each list needs an accessible name. The shared styles wrap horizontal triggers on narrow screens.

### Application ownership

Supply tab IDs, names, and panel content. Own data requests, validation, routing, and any state that must outlive inactive panels.

### Gallery

Open `?gallery=tabs` to compare retained drafts with panels that dispose their content.

## Breadcrumbs

Breadcrumbs shows the path to the current screen.

### Import

Import `Breadcrumbs` from `@wfe/components/breadcrumbs` or the package root.

### Example

```tsx
import { Breadcrumbs } from '@wfe/components/breadcrumbs'

export function RecordPath() {
  return (
    <Breadcrumbs aria-label="Record navigation">
      <Breadcrumbs.List>
        <Breadcrumbs.Item>
          <Breadcrumbs.Link href="/records">Records</Breadcrumbs.Link>
        </Breadcrumbs.Item>
        <Breadcrumbs.Item>
          <Breadcrumbs.Separator />
          <Breadcrumbs.Current>Sample record</Breadcrumbs.Current>
        </Breadcrumbs.Item>
      </Breadcrumbs.List>
    </Breadcrumbs>
  )
}
```

### Behavior and options

The root renders a named `nav` element. Its default accessible name is Breadcrumbs.
Supply `aria-label` when a screen contains several navigation regions.
`List` renders an ordered list. Each `Item` renders a list item.
`Link` renders a native anchor and requires an `href`.
`Current` renders a noninteractive span with `aria-current="page"`.
Place one current item at the end of the path.
`Separator` renders an `aria-hidden` span. Place it inside each item after the first, before its label.
The root `separator` prop changes the default slash. A separator can also supply its own children.
Separators are decorative. Keep links and controls outside them.
The shared list wraps at narrow widths and retains visible focus around links.

### Application ownership

Supply link destinations and the current page. The browser handles native links. The application owns routing and browser history.

### Gallery

Open `?gallery=breadcrumbs` for a path with links and a current item.

## Sidebar context switcher

SidebarContextSwitcher offers searchable contexts and an optional parent action.

### Import

Import `SidebarContextSwitcher` and `DashboardShell` from `@wfe/components/layout`.

### Example

```tsx
<DashboardShell
  navigation={(navigation) => (
    <div class="ui-dashboard-menu">
      <SidebarContextSwitcher
        value={currentContext()}
        options={siblingContexts()}
        parent={parentContext()}
        onValueChange={requestContext}
        compact={navigation.compact()}
      />
      {renderContextMenu(navigation)}
    </div>
  )}
>
  {renderCurrentPage()}
</DashboardShell>
```

### Behavior and options

#### Controlled values

A `SidebarContext` contains an opaque `id`, a `kind`, a `name`, and an optional `disabled` flag.
The application supplies the display name, including any path such as `Atlas / dev`.
IDs in `options` must be unique. Duplicate IDs produce an explicit error.
The accepted `value` can be absent from `options`.

`onValueChange(context)` requests a sibling or parent context.
The callback receives the current application-supplied record.
The trigger changes only when the application replaces `value`.
A request closes the popup even if the application rejects it.
The component never treats a request as an accepted selection.

Omit `parent` when there is no parent action.
The component does not infer a parent from a name or option order.
A disabled record remains visible but cannot send a request.
Setting `disabled` disables the trigger and closes an open popup.

Search uses the shared fuzzy matcher on `kind` and `name`.
Search text clears when the popup closes.
The popup presents native action buttons in a list, rather than an editable selected-value field.

#### Dashboard composition

Place the switcher first in the dashboard navigation callback.
Use the callback's `compact()` value so the mobile drawer retains full labels.
Supply an optional decorative `icon` for both expanded and compact presentation.
Without an icon, the compact trigger shows the first character of the context kind.
Its accessible name and tooltip retain the full context.

The application replaces the menu when it accepts another context.
Existing `SidebarGroup` controls support expandable menu items and nested groups.
They retain their existing controlled selection, disclosure, compact flyout, and mobile behavior.

#### Keyboard and focus

Opening focuses the search input. Escape closes the popup and restores the trigger.
Arrow Down from search focuses the first enabled choice.
Arrow keys, Home, and End move between enabled choice buttons.
Enter and Space activate the focused button. Tab retains native focus order.
Home and End in the input retain normal text editing behavior.

Immutable option updates retain buttons with the same IDs.
If a focused choice or parent disappears or becomes disabled, focus returns to search.
Application navigation that moves focus elsewhere takes priority over popup focus restoration.

Optional `label`, `searchLabel`, `emptyLabel`, and `parentLabel` props replace the default interface text.
The shared popup, inputs, buttons, sidebar colors, and available viewport height control presentation.

### Application ownership

Supply accepted context records, relationships, permissions, and the menu. Handle navigation and browser history in the application.

### Gallery

Open `?gallery=contexts` for searchable choices, parent navigation, and compact navigation.

## Commands and search

Command lists searchable actions and links, and CommandPalette puts the same list in a modal dialog.

### Import

Import `Command`, `CommandPalette`, and `createCommandShortcut` from `@wfe/components/command` or the package root.

### Example

```jsx
import { Command } from '@wfe/components/command'

export function NavigationSearch() {
  return (
    <Command
      label="Find a page"
      items={[{ id: 'records', label: 'Records', href: '/records' }]}
    />
  )
}
```

### Behavior and options

#### Items and selection

Pass a readonly `items` array and a search `label`.
Each `CommandItem` needs a stable, unique `id` and a `label`.
Optional `keywords` add search terms, and `group` supplies a group heading.
`description`, `icon`, and `shortcut` add supporting content.
The `shortcut` on an item is display text. It does not register a keyboard handler.
`disabled` keeps an unavailable item visible and prevents activation.

An item can supply `onSelect(event)`.
The control can also supply `onSelect(item, event)`.
The item callback runs first. Calling `event.preventDefault()` cancels the outer callback, native navigation, and automatic palette closing.
The event is the mouse or keyboard event that activates the item.

For navigation, give the item an `href` and an optional `target`.
The item renders a real link.
Modified clicks preserve browser navigation without running selection callbacks or closing the palette.
Applications can intercept ordinary navigation in their selection callback when they need a router.

The search input has the `combobox` role.
Results use a named `listbox`, and each result has the `option` role.
Tab moves from search into the active result.
Arrow keys move between available results, and Enter activates one.
Shift+Tab returns from the result to search.
Unavailable results do not activate.

#### Query and result ownership

Use `query` with `onQueryChange` for an application-controlled query.
Use `defaultQuery` for an initial query that the control then owns.
The default `filter="fuzzy"` searches the supplied items locally.
Use `filter="none"` when the application already filters or ranks results.
The control preserves the supplied order in this mode.

`loading` announces pending work. It does not remove supplied items.
The application decides whether to keep old results while a request runs.
`error` displays application-supplied error content, and `empty` supplies the empty-result content.
`messages` accepts partial `CommandMessages` overrides for loading text, empty-result text, and result counts.
`placeholder`, `inputRef`, and `class` support composition.

#### Modal palette

`CommandPalette` accepts the command props and requires a dialog `title`.
Use `open` with `onOpenChange` for controlled visibility, or use `defaultOpen` for initial visibility.
`trigger` supplies the content of the shared dialog trigger, such as text or an icon.
Do not put a second button inside `trigger`.
An application can also control visibility from its own button.

`closeOnSelect` defaults to `true`.
Set it to `false` for actions that leave the palette open.
`closeLabel` supplies the close button's accessible name.
The dialog focuses search when it opens and restores focus when it closes.
Escape dismisses the dialog.
An uncontrolled query restarts from `defaultQuery` when the palette reopens.
A controlled query persists until the application changes it.

Keyboard shortcuts are opt-in.
Set `shortcut` to `true` to accept Command+K or Control+K.
The default shortcut ignores text editors and other dialogs.
For a custom shortcut, pass a configuration with `key`, `allowInEditable`, or `when(event)`.
Register one global palette per application scope and let the application decide when it is available.

`createCommandShortcut` also works without the palette wrapper.
Call it inside a Solid owner and supply `onTrigger(event)`.
Its optional `enabled`, `key`, `allowInEditable`, `when`, and `document` properties control registration and scope.
The helper releases its registration when its owner is disposed.
The most recently registered eligible owner handles a matching event.

### Application ownership

Supply item IDs, labels, links, and callbacks. For remote results, own the query, request cancellation, response order, caching, and access rules.

### Gallery

Open `?gallery=commands` for local actions, links, and a palette that uses a mock search request.

## Context menus

ContextMenu opens a shared menu from a focusable region.

### Import

Import `ContextMenu` from `@wfe/components/context-menu` or the package root.

### Example

```jsx
import { ContextMenu } from '@wfe/components/context-menu'

export function RecordMenu(props) {
  return (
    <ContextMenu>
      <ContextMenu.Trigger aria-label="Record actions">
        Sample record
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content>
          <ContextMenu.Item onSelect={props.onOpen}>
            Open record
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu>
  )
}
```

### Behavior and options

Place `ContextMenu.Trigger` and `ContextMenu.Portal` inside the root.
Place `ContextMenu.Content` inside the portal.
The item, group, checkbox, radio and submenu parts use the same controls as `DropdownMenu`.
Give the trigger an accessible name.
The menu inherits its name from the trigger association.

Right-click opens the menu at the pointer.
Shift+F10 and the Context Menu key open it at the focused region.
Touch users can hold a noninteractive part of the region for 600 milliseconds.
Movement, release, cancellation, disabling and disposal cancel a pending hold.
`longPressDelay` changes the hold duration on the trigger.
Text inputs and editable content keep their native context menus.
Touch holds on buttons and links keep their native behavior.

The optional root `open` and `onOpenChange` properties support controlled acceptance.
Ordinary clicks do not open the menu.
Caller event handlers can prevent opening through `preventDefault()`.
The trigger `disabled` property prevents opening without changing its children.

The menu retains the existing keyboard navigation, disabled items, submenus and focus restoration.
It shares popup containment and theme inheritance with the other menus.
The trigger uses the shared focus style.

Sketchy adds the shared primary backing around open menus and submenus.
Vanilla and Laser retain their surface styles.

Opening uses the pointer coordinates without a body-size probe or element layout-shift observer.
The shared popup engine still measures the menu for placement and viewport containment.

### Application ownership

Supply the trigger content, available actions, and callbacks. Own permissions and record changes. In controlled mode, supply the accepted open state.

### Gallery

Open `?gallery=context-menu` for record actions, nested menu items, and controlled rejection.

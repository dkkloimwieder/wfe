# Commands and search

Import `Command` and `CommandPalette` from `@wfe/components/command` or the `@wfe/components` root.
Use `Command` for an inline list of searchable actions and navigation links.
Use `CommandPalette` to put the same list in a modal dialog.
Both controls use the shared theme, input, and selection styles.

## Items and selection

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
Applications own the action, permissions, and resulting state changes.

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

## Query and result ownership

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

The application owns requests, cancellation, response order, caching, and access rules.
Cancel a superseded request and ignore responses from an old request or context.
Replace `items` when the application changes context.
The component does not fetch records or infer which records a user can access.

## Modal palette

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

## Gallery example

The [command recipe](../examples/components/gallery/CommandRecipe.tsx) shows grouped local actions, real navigation links, and project context replacement.
Its modal search uses a mock request owned by the application.
The example requires three characters before a request and clears results below that threshold.
It includes 122 records per project and links to every gallery entry.
Ordinary gallery navigation uses the gallery router without a page reload.
The example cancels old requests and guards against late responses after a query, context, or visibility change.
It also demonstrates empty results, errors, recovery, and a retained application draft.
Open `?gallery=commands` in the component gallery to review it in each theme.

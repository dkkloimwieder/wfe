# Sidebar context switcher

`SidebarContextSwitcher` presents an accepted context, searchable sibling choices, and an optional parent action.
Import it from `@wfe/components/layout` or the component package root.
Applications supply all records, relationships, permissions, menus, and navigation callbacks.
The component does not fetch data, build a hierarchy, or change browser history.

## Controlled values

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

## Dashboard composition

Place the switcher first in the dashboard navigation callback.
Use the callback's `compact()` value so the mobile drawer retains full labels.
Supply an optional decorative `icon` for both expanded and compact presentation.
Without an icon, the compact trigger shows the first character of the context kind.
Its accessible name and tooltip retain the full context.

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

The application replaces the menu when it accepts another context.
Existing `SidebarGroup` controls support expandable menu items and nested groups.
They retain their existing controlled selection, disclosure, compact flyout, and mobile behavior.
No additional tree component is required for two menu levels.

## Keyboard and focus

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

## Example

The component gallery includes Context switcher under Navigation.
The components preview also exposes `?contexts=1` for a complete dashboard example.
The mock application owns organization, project, and environment records and replaces its menu after accepted changes.
It demonstrates rejected requests, parent navigation, an expandable child list, compact navigation, and retained form text.
These choices demonstrate the API and do not prescribe application behavior.

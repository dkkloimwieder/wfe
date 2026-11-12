# Context menus

`ContextMenu` opens the existing menu engine from a focusable region.
Import it from `@wfe/components` or `@wfe/components/context-menu`.
Import the shared stylesheet once.

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
Applications own record actions and permission decisions.
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

The gallery route `?gallery=context-menu` demonstrates record actions, pinning, nested copy actions and controlled rejection.
It retains a draft input across menu interactions.
Gallery acceptance remains a user review step.

# Behavior entry points

This directory exposes the owned behavior for Select, Combobox, Checkbox, Switch, RadioGroup, Dialog, AlertDialog, Popover, DropdownMenu, Tooltip, and Toast.
Control entry points import the single [Kobalte subset](../../vendor/kobalte/README.md).
The modal helper composes external Solid Primitives interaction behavior with Solid state and effects.
Owned Kobalte dialogs consume that helper.
The shared hidden-select entry point exposes the native-form bridge used by Select and Combobox.
These modules contain no duplicate control implementation or presentation CSS.

The [component wrappers](../../components/README.md) add shared styles, icons, and generic composition.
Applications import those wrappers through `@wfe/components` or its public component subpaths.
Internal behavior modules are implementation details, not application imports.
`SelectField` composes Select for one string choice. Combobox adds editable search text.
`NativeSelect` remains an explicit compatibility export for native browser integration.

[Shared styles](../../styles/README.md) own control presentation and state rules.
Applications explicitly import `@wfe/components/styles.css` and use a `data-ui` scope.
Solid and Solid Primitives remain external imports.
The owned subset retains upstream attribution and records local repairs in its provenance files.

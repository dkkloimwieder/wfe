# UI contracts

These contracts describe how applications use shared UI code. They cover package boundaries, control state, native events, and styled props.

Contents

- [Generic UI boundaries](#generic-ui-boundaries)
- [Control state and change callbacks](#control-state-and-change-callbacks)
- [Native event listener ownership](#native-event-listener-ownership)
- [Styled component props](#styled-component-props)

## Generic UI boundaries

The library owns presentation and generic interaction.

### Import

#### Package

`packages/components` provides the private package `@wfe/components`.
It owns generic controls, Table presentation, the native engine, shared styles, and internal behavior.
The vendor directory contains original licenses, provenance, and documented source repairs.
Component subpaths expose styled controls through the public API.
`@wfe/components/table` exports Table, its controls, and the native engine.
`@wfe/components/virtual` exports the shared virtual binding and row renderer.
`@wfe/components/styles.css` supplies scoped styles and theme variables.
The package remains private.

#### Import directions

Applications import `@wfe/components`, the native engine, and external Solid Primitives as needed.
Styled controls import their shared internal behavior.
Its Table subpath uses native engine types and caller-owned Table objects.
Its virtual subpath owns the existing vendored virtual engine and one Solid binding.
`@wfe/components` imports external Solid, Solid Primitives, and Floating UI.
Internal behavior does not import Table presentation.

The library does not import application models, demo transports, generated screens, or WAMN modules.
Examples import the library. The library never imports examples.
The canonical `nativeEvents` helper lives in `@wfe/components/events`.
The example helper re-exports this implementation. Library source has no example imports.

Solid and Solid Primitives remain external dependencies.
Floating UI also remains external.
Packages declare the runtime dependencies that they use directly.
Solid runtime dependencies use peer declarations and matching development pins to preserve one runtime instance.
The workspace lockfile keeps the currently qualified versions.
Components import external primitives as needed.
Their component tests cover those imports without a separate qualification task.
Specific compatibility failures receive focused issues if they appear.
Required external dependency repairs use one shared patch mechanism.
Kobalte source repairs belong in the checked-in vendor source.

### Example

#### Documentation examples

From the repository root, run:

```sh
pnpm test:contracts
```

This command compiles every TypeScript example in this decision.
The examples specify contracts. Component tests establish behavior.

#### Overlay button presentation

Overlay buttons use the Button variant and tone contract.
Dialog and Sheet share their trigger and close implementations.
The following example covers the public button prop types and custom element composition.

```tsx
import { Button, Dialog, Popover, Tooltip } from '@wfe/components'
import type {
  DialogTriggerProps,
  DialogCloseButtonProps,
  AlertDialogTriggerProps,
  AlertDialogCloseButtonProps,
  AlertDialogCancelProps,
  PopoverTriggerProps,
  PopoverCloseButtonProps,
  DropdownMenuTriggerProps,
  TooltipTriggerProps,
} from '@wfe/components'

export const overlayAppearances: [
  DialogTriggerProps,
  DialogCloseButtonProps,
  AlertDialogTriggerProps,
  AlertDialogCloseButtonProps,
  AlertDialogCancelProps,
  PopoverTriggerProps,
  PopoverCloseButtonProps,
  DropdownMenuTriggerProps,
  TooltipTriggerProps,
] = [
  { variant: 'filled', tone: 'primary' },
  { variant: 'filled', tone: 'primary' },
  { variant: 'filled', tone: 'primary' },
  { variant: 'filled', tone: 'primary' },
  { variant: 'filled', tone: 'primary' },
  { variant: 'filled', tone: 'primary' },
  { variant: 'filled', tone: 'primary' },
  { variant: 'filled', tone: 'primary' },
  { variant: 'filled', tone: 'primary' },
]

// @ts-expect-error Variants use the same finite values as Button.
export const invalidOverlay: DialogTriggerProps = { variant: 'primary' }

export function OverlayExample() {
  return (
    <>
      <Dialog>
        <Dialog.Trigger as={Button} variant="filled" tone="primary">
          Details
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Content>
            <Dialog.Title>Details</Dialog.Title>
            <Dialog.CloseButton variant="ghost" tone="primary">
              Close
            </Dialog.CloseButton>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
      <Popover>
        <Popover.Trigger variant="inverted">Display</Popover.Trigger>
      </Popover>
      <Tooltip>
        <Tooltip.Trigger as="a" href="#help" variant="outline" tone="primary">
          Help
        </Tooltip.Trigger>
      </Tooltip>
    </>
  )
}
```

File selection uses [FileInput](inputs.md#file-selection). Applications own selected objects and uploads. Files stay outside scalar form values.

### Behavior and options

#### Component contracts

Controlled components read current prop values and request changes through callbacks.
They do not treat a callback as proof that the application accepted a change.
Callbacks carry values or stable keys, rather than backend commands.
Components do not clone a canonical record store.
An uncontrolled mode requires an explicit `defaultValue` or `defaultOpen` contract.
A component must not switch ownership modes during its lifetime.

Text controls expose standard native attributes and forward refs to their actual input elements.
Choice controls use application-provided options and stable option keys.
The application owns option loading, search requests, paging, and missing-label resolution.
Combobox exposes search text separately from the selected key.
Footer content allows an application to provide paging controls.
The component supplies interaction behavior without embedding a paging service.

Labels, descriptions, errors, and disabled state remain generic props or composition slots.
Field components link accessible names and descriptions to controls.
The application decides validation rules and supplies error text.
The library does not execute business validation or submission requests.

Custom element rendering through `as` remains supported where Kobalte provides it.
Custom triggers and input wrappers must preserve refs, event handlers, and accessibility attributes.
Simple native controls use native attributes without introducing Kobalte behavior unnecessarily.

The following type example illustrates the controlled choice boundary.
It describes a contract, not an implemented component.
The documentation command compiles this example on the current pinned runtime.

```ts
import type { JSX } from '@solidjs/web'

export type ChoiceProps<Option> = {
  options: ReadonlyArray<Option>
  value: string | null
  onValueChange: (key: string | null) => void
  optionKey: (option: Option) => string
  optionLabel: (option: Option) => string
  disabled?: boolean
  label: JSX.Element
  description?: JSX.Element
  error?: JSX.Element
}

export type SearchChoiceProps<Option> = ChoiceProps<Option> & {
  searchValue: string
  onSearchValueChange: (text: string) => void
  loading?: boolean
  footer?: JSX.Element
  inputRef?: (element: HTMLInputElement) => void
}

export function choiceConfiguration(
  options: ReadonlyArray<{ key: string; name: string }>,
  value: string | null,
  searchValue: string,
  onValueChange: (key: string | null) => void,
  onSearchValueChange: (text: string) => void,
): SearchChoiceProps<{ key: string; name: string }> {
  return {
    options,
    value,
    searchValue,
    onValueChange,
    onSearchValueChange,
    optionKey: (option) => option.key,
    optionLabel: (option) => option.name,
    label: 'Category',
  }
}
```

#### Table contracts

Table receives an application-owned native table and renders its current state.
Sorting, filtering, grouping, summaries, column visibility, ordering, and resizing remain independent capabilities.
Read-only tables can expose all display features without constructing an editing model.
Editing uses shared cells and controls with application-provided composition.
The application owns drafts, validation, revisions, save rules, conflicts, permissions, and row actions.
The application also owns saved view persistence.

The components package owns the renderer and native engine.
This example uses its supported Table export.

```tsx
import type { NativeTable } from '@wfe/components/table'
import { ReadOnlyTable } from '@wfe/components/table'

export function Results<Row, Metadata>(props: {
  table: NativeTable<Row, Metadata>
}) {
  return (
    <ReadOnlyTable
      table={props.table}
      title="Results"
      controls={{ sorting: true, filtering: true, grouping: true }}
    />
  )
}
```

Analytics receives query results, range callbacks, server sorting callbacks, and export callbacks from the application.
It does not apply local search or filtering to the query result.
The default preview remains 1,000 rows.
Full browsing requests pages through the application adapter.
The application owns transport, cancellation, page caching, and memory estimates.
Export passes query identity, sorting, and ordered column IDs with display labels.
The application exports the full query through its server.
The library does not generate CSV or infer backend permissions.

Virtualization remains optional.
Both fixed and measured rows use the existing vendored engine and one Solid binding.
The virtual binding computes visible ranges. It does not fetch records.
Fixed geometry remains bounded for large result counts.
Measured rows retain sizing and anchoring.

#### Styles and rendering

Applications explicitly import `@wfe/components/styles.css` once.
JavaScript entry points do not silently import global styles.
The CSS export counts as a side effect in package metadata.
Component selectors do not reset `body`, `main`, or unrelated native elements.
Shared variables define fonts, spacing, borders, colors, focus, and density.
Compact styling is the default. Optional themes override shared variables.
Portals inherit the configured theme through a supported container or explicit theme scope.
The same density configuration supplies fixed row geometry and CSS row height.
Analytics preserves its reserved viewport height during loading and result changes.

Library modules do not access browser globals during import or server rendering.
DOM listeners, observers, measurements, and portals start within a client lifecycle.
Disposal removes those resources.
Stable IDs preserve label links when hydration attaches to existing HTML.
Client hydration must retain server-rendered cells and support later interaction.
Package builds follow the existing Solid source, server, and distribution export conventions.
Consumer tests must cover each supported condition before the package claims support.

### Application ownership

Applications own their records, permissions, validation, routing, requests, and persistence.

### Gallery

#### Current catalog

The [feature catalog](features.md) lists public packages and controls. The [qualification guide](qualification.md) describes the checks for package boundaries, rendering, and cleanup.

## Control state and change callbacks

Controls expose current state and callbacks for change requests.

### Behavior and options

#### Current APIs

Use the preferred callback names below for new consumers.
The listed legacy aliases remain supported.
The compound controls expose separate root, input, label, and other parts.
A callback on a compound root can carry a value rather than a DOM event.

| Family                                       | Current change callback              | Value and event shape                                                                                   |
| -------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `Input`, `Textarea`                          | `onValueChange`                      | String, then `InputEvent`. Empty text is `''`.                                                          |
| `NativeSelect`                               | `onValueChange`                      | String, then `Event`. Native DOM handlers remain separate.                                              |
| `NumberInput`                                | `onValueChange`                      | Number or `undefined`, then `InputEvent`.                                                               |
| `SelectField`                                | `onValueChange`                      | String without an event argument. Empty selection is `''`.                                              |
| `DatePicker`, `TimePicker`, `DateTimePicker` | `onValueChange`                      | String or `undefined`, without an event argument. Empty values use `undefined`.                         |
| `Select`, `Combobox` roots                   | `onValueChange`, legacy `onChange`   | Selected option or `null` for single selection, option array for multiple selection. No event argument. |
| `RadioGroup` root                            | `onValueChange`, legacy `onChange`   | Selected string without an event argument.                                                              |
| `Checkbox`, `Switch` roots                   | `onCheckedChange`, legacy `onChange` | Checked boolean without an event argument.                                                              |
| `FileInput`                                  | `onFilesChange`                      | File array without an event argument. Empty selection is `[]`.                                          |
| `Tabs`                                       | `onValueChange`                      | Selected string without an event argument.                                                              |

`NumberInput` requests `undefined` for empty input unless `allowEmpty` is `false`.

`DateTimePicker` displays one combined date and time input.
Complete valid typed input requests an instant immediately.
Calendar and time choices in its popup remain local until Apply date and time requests one complete instant.
Cancel or Escape discards pending popup choices without a callback.

`Checkbox` and `Switch` use `checked` and `defaultChecked` for boolean state.
Their separate `value` is the string submitted by a native form.
Checkbox `indeterminate` remains separate from checked state.
`Combobox` also separates search text from accepted option selection through its existing input-value API.
Existing default-value props remain available where the family supports them.
This decision adds no default-value prop to another family.

Owned native fields, `SelectField`, numeric fields, date fields, and `FileInput` use lowercase `readonly` and boolean `invalid`.
Supported states fall back to their enclosing `Field` through the existing implementations.
`Checkbox`, `Switch`, `RadioGroup`, `Select`, and `Combobox` roots support `readonly` and `invalid` with `readOnly` and `validationState` aliases.
These compound roots inherit required, disabled, read-only, and invalid state from the shared `Field`.
The primitive retains its existing form-control owner.
Native elements retain their browser-specific limitations, including the absence of native select read-only behavior.

#### Compatible callback names

Scalar and selection controls use `value` with `onValueChange`.
Boolean controls use `checked` with `onCheckedChange`.
Files retain `files` with `onFilesChange`.
Checkbox `value` never becomes a boolean alias.
Existing value shapes and empty representations remain unchanged.

Legacy compound-root `onChange` remains a supported value callback.
When both names are supplied, the latest preferred callback wins and runs once.
For boolean controls, that callback is `onCheckedChange`. For scalar and selection controls, it is `onValueChange`.
The implementation does not call both aliases for one request.

Native `onInput` and `onChange` handlers keep their DOM event meaning on native controls and applicable input parts.
They do not become value-callback aliases.
Existing cancellation, composition, controlled restoration, and form reset behavior remain intact.
Each family preserves the events it already supplies.

#### Compound state precedence

Lowercase `readonly` and boolean `invalid` are the preferred state names.
Existing `readOnly` and `validationState` props remain supported aliases where they already exist.
The five compound families implement the following shared `Field` precedence.

The resolution for read-only state is `readonly ?? readOnly ?? Field.readonly`.
For invalid state, an explicit `invalid` wins.
Otherwise, a supplied `validationState` resolves to whether it equals `'invalid'`.
Without either prop, the control inherits `Field.invalid`.
Thus, legacy `'valid'` overrides an inherited invalid state.

An explicit `false` wins over an alias or inherited `true`.
Undefined means that the control falls back to the next source.
Shared `disabled` and `required` props follow the same explicit-prop-before-Field rule.
These rules use nullish fallback, never logical OR.
Native disabled fieldsets and the first-legend exemption retain browser behavior.
A control prop cannot enable an input that the browser disables through its fieldset.

ARIA overrides remain accessibility attributes.
They do not change accepted values, validation results, or whether application commands are available.
Labels and descriptions refer to the actual control target, rather than an arbitrary wrapper.
`Field` labels target the Checkbox or Switch input, Select trigger, or Combobox input.
RadioGroup uses the Field label IDs to name its accessible group, without an invalid HTML label target.
Caller-supplied and primitive-owned labels and descriptions remain available.
An explicit control `aria-label` retains its existing naming behavior.

#### Deferred custom controls and server rendering

A conditional or custom wrapper can defer a native input or trigger until after its Field label renders.
For a custom target ID, set `Field.controlId` and omit the nested input or trigger ID.
Without a custom ID, the nested target inherits the Field-generated ID.

For example, set `controlId="choice-input"` on the Field.
Place its Label before a Show that contains your custom Checkbox component.
Inside that component, render `Checkbox.Input` without an `id` prop.

Direct compound roots prepare their explicit target IDs before sibling labels render on the server.
This process does not discover arbitrary targets inside deferred application components.
For a deferred native input or trigger, put the ID on `Field.controlId`.
Do not repeat it on the root wrapper.
This fallback does not apply to a deferred RadioGroup, which uses an accessible group name instead of an HTML label target.

#### Compatibility checks

Test callback precedence, current callback replacement, explicit false, and rejected controlled requests. Keep native events, form behavior, access, and cleanup in scope for server rendering and hydration.

### Application ownership

Applications own accepted values and decide whether to accept a change request.
Controls own input interaction, accessible associations, and native form behavior.
Neither a callback nor an accessibility attribute supplies application validation or persistence policy.

## Native event listener ownership

The native event helper attaches listeners and releases them when its owner disposes.

### Import

Import `nativeEvents` from `@wfe/components/events`.

### Behavior and options

Create its ref inside a Solid owner, then attach the ref to one element. The ref can run without an active owner.

Registration waits for settlement. Disposal removes the listeners even if the element already left the document. Disposal before settlement attaches nothing.

The helper captures the handler map at settlement. Use lowercase native event names, such as `click` and `submit`. If a handler needs changing application state, read it inside a stable callback.

Styled components use an internal adapter for JSX event props. It tracks available prop names and reads the current handler when an event fires. Reactive spreads can add or remove event names while the control stays mounted. The adapter supports functions, bound handler tuples, and `undefined`.

Both adapters pass through the original native event and its default-prevention state.

Keep the owned native listeners until a compatible runtime passes the trusted and synthetic event reproductions and real component cleanup checks. Beads issue `wfe-0dj.5` tracks that work.

### Application ownership

The application owns the work performed by its callbacks.

## Styled component props

Styled components export the props that each part supports.

### Import

Import named props from `@wfe/components` or the component's existing subpath, such as `@wfe/components/select`.

### Behavior and options

Both paths export the same owned types.
Checkbox, Switch, RadioGroup, Select, and Combobox parts expose named types with their supported styling props.
Dialog, AlertDialog, Popover, DropdownMenu, and Tooltip parts expose these types too.
For example, `SelectTriggerProps` includes decoration and structured classes, while `SelectContentProps` includes the footer and status slots.
Decoration remains limited to the parts that render a decoration surface.
A root does not acquire decoration merely because one of its parts supports it.

Prop types keep their existing generic element parameter, including the legacy HTMLElement form.
The component functions retain their polymorphic `as` behavior and native attributes for the selected element.
The named prop types describe the options and references that each part owns.
Use the component signature to combine these options with native or custom-element props.
Select and Combobox retain Option and OptGroup parameters and their single/multiple selection union.
Single selection requests an option or null. Multiple selection requests an option array.
The styling additions do not collapse that distinction.

The seven subpaths that previously exported all primitive types now enumerate their exports.
Existing primitive Options, CommonProps, RenderProps, state, context, and type-only component names remain explicitly available from those subpaths for compatibility.
Existing names for styled parts now point to the owned wrapper types rather than the narrower primitive types.
No import-path migration is required for those names.
These compatibility exports do not make internal primitive details a new recommended application API.
Prefer the named owned Props types when describing a styled component.
All added prop exports are type-only and do not import additional runtime components.

`BUTTON_VARIANTS`, `BUTTON_TONES`, and `VALUE_FORMATS` expose the finite supported values.
Their union types derive from the same arrays.
`isButtonVariant`, `isButtonTone`, and `isValueFormat` validate unknown values against those contracts.
Generator validation uses those same guards rather than separate lists.
The arrays describe existing behavior. They do not add variants, tones, formats, or new validation policy.

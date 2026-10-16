# Generic UI boundaries

This decision defines the generic UI library under Beads epic `table-qp8`.
The private workspace package follows the organization below.
Select and Combobox behavior exports exist in `@wfe/components`.
Scoped styles and shared density values exist in `@wfe/components`.
Shared Table and column exports exist in `@wfe/components/table`.
The shared virtual engine and binding exist in `@wfe/components/virtual`.
Styled control families use the owned behavior and shared styles.
WAMN is a prospective consumer. Its interface does not define the library API.

## Package

`packages/components` provides the private package `@wfe/components`.
It owns generic controls, Table presentation, the native engine, shared styles, and internal behavior.
The vendor directory contains original licenses, provenance, and documented source repairs.
Component subpaths expose styled controls through the public API.
`@wfe/components/table` exports Table, its controls, and the native engine.
`@wfe/components/virtual` exports the shared virtual binding and row renderer.
`@wfe/components/styles.css` supplies scoped styles and theme variables.
The package remains private during extraction.

## Import directions

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
Floating UI also remains external in the initial scope.
Packages declare the runtime dependencies that they use directly.
Solid runtime dependencies use peer declarations and matching development pins to preserve one runtime instance.
The workspace lockfile keeps the currently qualified versions.
Components import external primitives as needed.
Their component tests cover those imports without a separate qualification task.
Specific compatibility failures receive focused issues if they appear.
Required external dependency repairs use one shared patch mechanism.
Kobalte source repairs belong in the checked-in vendor source.

## Component contracts

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

The following type example defines the proposed controlled choice boundary.
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

## Table contracts

Table receives an application-owned native table and renders its current state.
Sorting, filtering, grouping, summaries, column visibility, ordering, and resizing remain independent capabilities.
Read-only tables can expose all display features without constructing an editing model.
Editing uses shared cells and controls with application-provided composition.
The application owns drafts, validation, revisions, save rules, conflicts, permissions, and row actions.
The application also owns saved view persistence.

The existing renderer now lives in the private UI package.
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

## Styles and rendering

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

## Initial catalog

The initial form catalog contains Button, IconButton, Input, Textarea, Field, Label, HelpText, FieldError, FieldSet, and InputGroup.
Choice controls contain Select and Combobox.
Boolean and exclusive-choice controls contain Checkbox, Switch, and RadioGroup.
Overlays contain Dialog, AlertDialog, Popover, DropdownMenu, and Tooltip.
Sheet uses Dialog behavior with a different presentation.
Display components contain Badge, Card, Separator, InlineAlert, EmptyState, Spinner, Skeleton, Progress, and Toast.
Table contains shared headers, cells, column controls, groups, summaries, optional editors, and optional virtual rows.

Tabs, Collapsible, and Accordion remain later candidates.
Date, time, and file controls require concrete use cases before design.
WAMN wrappers, generated forms, navigation layouts, and production migration remain outside this milestone.

## Delivery order

The boundary task establishes this decision and compiles its examples.
The workspace structure pass creates the private packages before source migration.
Style and source tasks then follow their stored dependencies.
The vendor task checks in Select, Combobox, and their required shared modules.
Control families and Table extraction follow their stored Beads dependencies.
Each implementation task includes its own behavior and cleanup tests.
The isolated consumer fixture then proves composition through public imports.
Final tests cover source and distribution builds, types, lint, server rendering, hydration, interaction, and disposal.
Heavy tests run serially because host load varies.
Timing results remain advisory. Correctness and bounded resources remain required.

## Documentation examples

From the repository root, run:

```sh
pnpm test:contracts
```

This command compiles every TypeScript example in this decision.
The examples specify contracts. Component tests establish behavior.

## Overlay button presentation

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
  { variant: 'filled', tone: 'accent' },
  { variant: 'filled', tone: 'accent' },
  { variant: 'filled', tone: 'accent' },
  { variant: 'filled', tone: 'accent' },
  { variant: 'filled', tone: 'accent' },
  { variant: 'filled', tone: 'accent' },
  { variant: 'filled', tone: 'accent' },
  { variant: 'filled', tone: 'accent' },
  { variant: 'filled', tone: 'accent' },
]

// @ts-expect-error Variants use the same finite values as Button.
export const invalidOverlay: DialogTriggerProps = { variant: 'primary' }

export function OverlayExample() {
  return (
    <>
      <Dialog>
        <Dialog.Trigger as={Button} variant="filled" tone="accent">
          Details
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Content>
            <Dialog.Title>Details</Dialog.Title>
            <Dialog.CloseButton variant="ghost" tone="accent">
              Close
            </Dialog.CloseButton>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
      <Popover>
        <Popover.Trigger variant="inverted">Display</Popover.Trigger>
      </Popover>
      <Tooltip>
        <Tooltip.Trigger as="a" href="#help" variant="outline" tone="accent">
          Help
        </Tooltip.Trigger>
      </Tooltip>
    </>
  )
}
```

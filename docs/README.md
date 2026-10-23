# Documentation

Start with the [current feature catalog](features.md) to see what the public packages provide.
Read the [adoption guide](adoption.md) for imports, application ownership, and server rendering.
The catalog describes implemented functionality. [Plans](plan/README.md) describe proposed work.
Update the catalog and the relevant API guide in the same change that adds a public capability.
Beads records task status and dependencies.

## Package contracts

- [Adoption and controlled state](adoption.md)
- [UI ownership boundaries](contracts/UI-BOUNDARIES.md)
- [Control state and callback vocabulary](control-contract.md)
- [Native event listener ownership](native-events.md)
- [Styled component props and shared values](styled-component-types.md)
- [Form contract](form-contract.md)
- [Generator contract](generator-contract.md)
- [Generated view and shell messages](view-messages.md)
- [Dashboard layout](layout.md)
- [EntryPanel](entry-panel.md)
- [Described application shell](../packages/shell/README.md)
- [Charts](charts.md)

## Component guides

- [Default theme](theme.md)
- [Owned icon catalog](icons.md)
- [Button variants and tones](button-variants.md)
- [Date picker and calendar](date-picker.md)
- [Date and datetime fields](date-inputs.md)
- [Status tiles](status-tiles.md)
- [Status and display messages](display-messages.md)
- [Numeric fields](number-inputs.md)
- [File input](file-input.md)
- [Form layout](form-layout.md)
- [Tabs](tabs.md)
- [Breadcrumbs](breadcrumbs.md)
- [Sidebar context switcher](sidebar-context-switcher.md)
- [Collapsible content](collapsible.md)
- [Accordion](accordion.md)
- [Resizable panes](resizable.md)

## Tables

- [Engine capabilities and search policy](table-engine.md)
- [Table workspace](table-workspace.md)
- [Filters and explicit apply](table-filters.md)
- [Display formatting](table-formatting.md)
- [Cell selection and copy](table-selection.md)
- [Table diagnostics](table-diagnostics.md)

## Examples and qualification

- [Examples and preview commands](../examples/README.md)
- [Component gallery](component-gallery.md)
- [Combobox matching](combobox-matching.md)
- [Appearance review](appearance-review.md)
- [Theme ownership in examples](example-themes.md)
- [Qualification commands and reports](qualification.md)
- [Native tab investigation](native-tab-investigation.md)
- [Action disposal investigation](action-disposal-investigation.md)
- [Shared style ownership](../packages/components/src/styles/README.md)

## Plans and historical records

- [Implementation plans](plan/README.md)
- [October 16 consistency audit](consistency-audit.md), a dated assessment rather than current API status
- [October 22 structure audit](structure-audit-2026-10-22.md), a dated review of cohesiveness, code quality, and modularity
- [Repository extraction](../migration/README.md) and [standalone acceptance](../migration/standalone.md)
- [Core source origin](origins/core/README.md)
- [Performance tools and historical findings](../bench/README.md)

Package guides stay beside their source when they describe implementation maintenance.
Vendor licenses, source hashes, and repair records stay beside each captured source tree.
Historical inventories keep their recorded paths and hashes.
Build outputs and qualification reports remain outside the documentation index.

See [row-dependent table actions](table-row-actions.md) for live row state, disabled buttons, and application callbacks.

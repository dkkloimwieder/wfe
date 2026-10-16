# WFE consistency audit

Date: October 16, 2026. Scope: `wfe-w2y.11`.

The library shares behavior, but its presentation contract is incomplete.
Examples and wrappers can bypass shared controls without a failing test.
That gap explains the mixed selects and missing hover states.
Uniform appearance needs shared components, shared state rules, and checks across real consumers.

## Coverage and limits

The static review covers the tracked packages, examples, documentation, scripts, and tests.
At the start of this audit, the repository inventory contained 580 tracked files. The package, example, documentation, script, and test paths account for 553 files.
Owned component source contains 84 files. Form source contains three files.
The review scans control markup, imports, CSS rules, icons, public exports, event helpers, and application boundaries.
It also inspects the shared wrappers, Table compositions, form coordinator, layout, virtualization, build configuration, CI, and existing test coverage.
Benchmark utilities and migration records contain no additional component implementation.

Vendor integrity checks cover source inventories, recorded hashes, licenses, and import ownership.
The audit does not propose vendor rewrites or dependency changes.
It does not claim that every visual state in every browser received a manual review.
The current browser evidence covers Chromium. Cross-browser appearance remains a follow-up requirement.

## Fixed: mixed Table controls

Issue: `wfe-w2y.10`.

The filter operator used NativeSelect. The filter value used Select.
NativeSelect drew a CSS chevron. The value control supplied a separate SVG.
Only buttons received the general hover rule.
Text fields, native selects, and checkbox controls therefore behaved differently.

Table controls now use Select for operators, choices, grouping, summaries, formatting, alignment, and choice editors.
SelectField composes the same Select parts for a simple string value.
It does not implement another selection engine.
The shared trigger owns its chevron, spacing, and alignment.
The filter no longer supplies its own chevron.
Editable fields share a hover rule that retains their existing background images.

Choice menus inside native header popovers remain inside that popover.
An open choice menu consumes Escape before the header popup.
Table editor menus retain their owner marker so focus does not cancel an edit.
Applications still own values, validation, filtering, and save requests.

## Fixed: consumer examples use shared controls

Issue: `wfe-w2y.12`.

[The form example](../examples/form-contract/App.tsx) and [the dashboard example](../examples/dashboard/main.tsx) use SelectField.
[Editing controls](../examples/table-editing/Table.tsx), [table configuration](../examples/table-editing/TableOptions.tsx), and [saved views](../examples/table-editing/TableViews.tsx) use shared controls.
[Analytics](../examples/analytics/main.tsx), [virtualization](../examples/virtualization/NativeApp.tsx), and [the WAMN fixture](../examples/wamn/App.tsx) also use shared controls.
SelectField inherits Field metadata and preserves accepted values and named form submission.
The examples retain their application callbacks and data rules.

NativeSelect remains a compatibility export for native browser integration.
Raw controls remain in explicit browser interoperability and scope-isolation tests.
They do not define another visual standard for application examples.

## P1: overlay triggers bypass the Button contract

Follow-up: `wfe-w2y.13`.

[Dialog](../packages/components/src/components/Dialog.tsx), [Popover](../packages/components/src/components/Popover.tsx), [Tooltip](../packages/components/src/components/Tooltip.tsx), and [DropdownMenu](../packages/components/src/components/DropdownMenu.tsx) assign `ui-button` directly.
[AlertDialog.Cancel](../packages/components/src/components/AlertDialog.tsx) does the same.
These wrappers do not supply the variant and tone defaults that [Button](../packages/components/src/components/NativeFields.tsx) supplies.
A shared class alone does not provide a shared component contract.

Use the same Button presentation and variant API for these parts.
Preserve the primitive behavior, caller handlers, polymorphic composition, focus, and references.
The overlay behavior does not justify different button appearance.

## P1: common style contracts remain fragmented

Follow-up: `wfe-w2y.14`.

[styles.css](../packages/components/src/styles/styles.css) repeats textarea and focus rules from [components.css](../packages/components/src/styles/components.css).
Select, Dialog, and Popover/Menu/Tooltip define their popup shells separately.
Their fallback borders, text colors, padding, and shadows differ.
Toast supplies a fixed shadow instead of the shared popup shadow role.
Disabled styling uses different combinations of native attributes, ARIA attributes, and primitive data attributes.
The package dark theme uses `#171d27` for its surface. The review switcher uses `#212529`.
Focus defaults also differ between package CSS and the review switcher.
Application overrides are valid, but previews need to distinguish overrides from the library defaults.

Consolidate common field and popup roles without changing approved colors.
Define consistent hover, focus, disabled, read-only, invalid, selected, and forced-color states.
Use the existing density values for geometry.
Do not force dialogs and menus to share dimensions or modal behavior.

## P2: repeated icons lack one owner

Follow-up: `wfe-w2y.15`. Existing refresh bug: `wfe-w2y.6`.

Checkmarks appear in [Checkbox](../packages/components/src/components/Checkbox.tsx), [SelectField](../packages/components/src/components/Select.tsx), and [TableColumnFilter](../packages/components/src/table/TableColumnFilter.tsx).
Consumer examples also draw choice indicators and chevrons.
The current fix removes the filter-specific chevron, but repeated drawings remain elsewhere.
The malformed refresh arrows already have a separate issue.

Give repeated glyphs shared geometry, sizing, and decorative accessibility behavior.
Preserve custom icon slots where applications need them.
No external icon dependency is necessary.

## P2: ownership documentation contains obsolete guidance

Follow-up: `wfe-w2y.16`.

[The component README](../packages/components/src/components/README.md) now documents current controls after `wfe-w2y.12`.
[The virtualization README](../packages/components/src/virtual/README.md) imports `@table/ui/virtual` and names an obsolete package command.
[The internal controls README](../packages/components/src/internal/controls/README.md) describes completed extraction passes as future work.
These documents give contributors conflicting instructions about the canonical implementation.

Update all tracked documentation examples to current exports and commands.
Explain that SelectField composes Select, while Combobox adds editable search behavior.
Document the temporary compatibility status of NativeSelect.

## P1: tests do not enforce consistency across consumers

Follow-up: `wfe-w2y.17`.

Existing tests cover behavior, accessibility, ownership, and selected geometry.
They did not compare the operator and value selects or require hover feedback from every filter field.
The current fix adds those comparisons across the approved accents and light/dark modes.

Add a shared control fixture that exercises the same states across tables, forms, and overlays.
Cover compact and comfortable density, disabled and read-only fields, invalid state, and forced colors.
Compare appearance and geometry as well as interaction behavior.
Portal resolution repeats in choiceScope, popupScope, and dialogScope.
The Select repair adds native-popover handling to choiceScope. Other families need equivalent nested-popup tests.
Share anchor resolution where policies match, but preserve intentional modal differences.
Add a usage guard with explicit exceptions for native interoperability fixtures.
A guard must not prohibit raw HTML inside the shared implementation itself.

## P2: the optional WAMN fixture repeats virtual window layout

Follow-up: `wfe-w2y.18`.

[The WAMN fixture](../examples/wamn/App.tsx) uses the shared createTableVirtualizer.
It still renders its own total-height container, translated window, and row loop.
Other consumers use [VirtualRows](../packages/components/src/virtual/VirtualRows.tsx) for that layout.
This is duplicate presentation around one shared engine, not another virtualization engine.

Use the shared block layout when integration work resumes.
Preserve the application row adapter, measurements, focus, and transport boundary.
This audit does not authorize changes to external WAMN inputs or optional integration preparation.

## Differences that remain intentional

SelectField is a convenient composition. Select exposes the same underlying parts for richer choices.
Combobox adds editable search text and therefore needs an input.
Single and multiple selection differ in selection behavior, not their visual standard.
Checkbox, Switch, and RadioGroup represent different interactions and retain their distinct shapes.
A dialog owns modal focus behavior. A tooltip does not.

The form package coordinates application-owned values and callbacks without implementing another set of fields.
Table stays inside components and uses one native engine.
Analytics and measured native rows use the same VirtualRows and createTableVirtualizer exports.
The optional WAMN fixture uses that virtualizer but still supplies its own window layout.
The editing example imports shared Table presentation rather than a second renderer.
Solid and Solid Primitives remain external imports.
Package source contains no application request or persistence implementation.

## Order of follow-up work

Table controls and normal consumer interfaces now use shared controls.
Next, make overlay triggers use the Button contract and consolidate common state styles.
Use the shared interaction matrix to prevent new divergence.
Centralize repeated icons and correct obsolete documentation in focused changes.

The follow-up issues record remaining work. This report does not mark those repairs complete.

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

## Fixed: overlay buttons share the Button contract

Issue: `wfe-w2y.13`.

[Dialog](../packages/components/src/components/Dialog.tsx), [Popover](../packages/components/src/components/Popover.tsx), [Tooltip](../packages/components/src/components/Tooltip.tsx), and [DropdownMenu](../packages/components/src/components/DropdownMenu.tsx) use the shared Button presentation helper.
[AlertDialog.Cancel](../packages/components/src/components/AlertDialog.tsx) uses that helper too.
Sheet inherits the Dialog buttons.
The helper owns classes, variant and tone defaults, and public presentation attributes.
It preserves explicit presentation through `as={Button}` composition.

Primitive behavior still owns overlay events and focus.
Custom elements receive the same button styles without another wrapper.
Default Tooltip buttons avoid form submission while custom links retain link behavior.

## Fixed: shared fields and floating surfaces have common style owners

Issue: `wfe-w2y.14`.

[The shared CSS entry](../packages/components/src/styles/styles.css) imports separate theme, button, field, surface, and state files.
Field borders and backgrounds have one owner.
Floating components share popup surface, text, border, and shadow roles.
Toast now honors the popup shadow role.
Component layout retains dialog dimensions, modal layers, and Switch/Radio shapes.
Existing hard and soft shadow defaults remain explicit.

Native fields honor the same disabled opacity role as buttons and toggles.
Read-only compound fields suppress hover feedback on their triggers.
Focus and invalid borders share state rules, with explicit compound-field focus suppression.
The library palette and approved review palette remain unchanged.
[The style guide](../packages/components/src/styles/README.md) distinguishes library defaults from application overrides.
Real component cases cover light/dark themes, compact/comfortable density, states, popup overrides, and forced colors.

## Fixed: repeated icons share one owner

Issues: `wfe-w2y.15` and `wfe-w2y.6`.

Shared `Icon` now owns repeated glyph geometry and decorative accessibility behavior.
Checkboxes, choice indicators, boolean values, date pickers, table controls, and example consumers use it.
Select, Combobox, and DropdownMenu icon slots retain custom children and share default chevrons.
Ordinary selects retain one shared CSS caret. An explicit icon slot replaces that caret.
Text-sized slots preserve calendar and expansion control dimensions.
Popup positioning arrows remain with their positioning primitive.
The refresh geometry fix is complete in `wfe-w2y.6`.
No external icon dependency is necessary.

## Fixed: ownership documentation uses current exports

Issue: `wfe-w2y.16`.

[The component guide](../packages/components/src/components/README.md) describes current imports and composition.
[The virtualization guide](../packages/components/src/virtual/README.md) uses `@wfe/components/virtual` and the root integrity command.
[The internal behavior guide](../packages/components/src/internal/controls/README.md) lists the completed control families and their owned source.
These guides distinguish public wrappers, internal behavior, and shared style ownership.
They explain SelectField composition, editable Combobox search, and explicit NativeSelect compatibility use.
Solid and Solid Primitives remain external dependencies.
Tracked documentation examples use current imports and commands.
Historical migration records retain their original source references.

## Fixed: consistency tests compare consumers and enforce shared control usage

Issue: `wfe-w2y.17`.

[The shared matrix](../examples/components/ConsistencyControls.tsx) compares public table, form, and popup controls.
It covers both densities and themes, shared field states, accepted and rejected values, all filter families, and forced colors.
Native and custom popup cases exercise pointer access, Escape, focus return, modal content, and cleanup.
These cases exposed two repairs: popup layers blocked nested choices, and table filters retained rejected text.
Child portals now stay inside their owning dialog or native popover.
Native header popups scroll their inner content so child options remain visible and reachable.
The table adapter uses shared text restoration and preserves composition drafts until commit.

[The usage guard](../scripts/check-controls.mjs) rejects raw controls, private imports, and NativeSelect in normal examples.
Its named exceptions retain native interoperability and scope-isolation cases.
The guard leaves the shared component implementation outside its scope.

[The CSS plugin](../scripts/css-provenance.mjs) selects the intended CSS entry and records actual compiler inputs.
It rejects wrong input directories, stale package copies, and source changes after compilation.
Client builds record input and asset hashes for browser comparison.
Live and hydration cases use the same provenance assertions.
Negative tests use real Vite builds with deliberately wrong or stale inputs.

## P2: the optional WAMN fixture repeats virtual window layout

Historical follow-up: `wfe-w2y.18`, now closed.

October 22 status: the fixture uses shared `VirtualRows` for its window layout.
The findings below describe the earlier audit state.

[The WAMN fixture](../examples/wamn/App.tsx) uses the shared createTableVirtualizer.
It still renders its own total-height container, translated window, and row loop.
Other consumers use [VirtualRows](../packages/components/src/virtual/VirtualRows.tsx) for that layout.
This is duplicate presentation around one shared engine, not another virtualization engine.

The audit recommended the shared block layout while preserving the application row adapter, measurements, focus, and transport boundary.
The completed repair follows that recommendation.
External WAMN inputs and optional integration preparation remain separate application work.

## Fixed: structured class values remain native

Resolved in `wfe-w2y.19`.

[Styled class composition](../packages/components/src/internal/classes.ts) preserves arrays, conditional maps, numbers, booleans, and empty values.
Native fields, styled controls, overlays, display components, dashboard layouts, and the table workspace use this shared helper.
Library classes remain present when caller classes change.
Public class properties accept the native Solid type.

The shared class fixture tests class changes, stable nodes, refs, events, polymorphic controls, and popup cleanup.
Source and package browser tests also exercise a conditional map that retains its object identity.
Server rendering and hydration use the same fixture and preserve the server nodes.

Qualification exposed two separate issues.
`wfe-w2y.20` now preserves later navigation and focus changes while opening focus waits.
`wfe-w2y.21` now marks stable default ID and ref snapshots explicitly while preserving reactive caller IDs through dynamic property spreads.

## Differences that remain intentional

SelectField is a convenient composition. Select exposes the same underlying parts for richer choices.
Combobox adds editable search text and therefore needs an input.
Single and multiple selection differ in selection behavior, not their visual standard.
Checkbox, Switch, and RadioGroup represent different interactions and retain their distinct shapes.
A dialog owns modal focus behavior. A tooltip does not.

The form package coordinates application-owned values and callbacks without implementing another set of fields.
Table stays inside components and uses one native engine.
Analytics and measured native rows use the same VirtualRows and createTableVirtualizer exports.
At the original audit, the optional WAMN fixture supplied its own window layout.
The closed `wfe-w2y.18` repair replaced it with shared `VirtualRows`.
The editing example imports shared Table presentation rather than a second renderer.
Solid and Solid Primitives remain external imports.
Package source contains no application request or persistence implementation.

## Fixed: live previews test real stylesheet saves

Resolved in `wfe-w2y.24`.

A running preview retained old imported CSS after the source changed.
Fresh servers supplied the current stylesheet, and the provenance endpoint detected the stale compilation.
Live tests now edit an imported stylesheet through real atomic and in-place saves.
Existing pages and fresh browser sessions must show each new value without a restart or document reload.
The tests retain control nodes and drafts and compare computed styles with stylesheet provenance.
Direct CSS requests run after the save phases to avoid changing watched dependencies during the test.
A temporary editor restores exact source bytes on success, failure, and interruption and preserves unexpected concurrent edits.
Reports retain original backups, watcher events, and module details after failures.
The current tests do not reproduce the earlier stale compilation, so this change adds coverage without a speculative runtime repair.

## Fixed: choice metadata shares field presentation

Resolved in `wfe-w2y.25`.

Select and Combobox now use presentation wrappers for field labels, help text, and errors.
The wrappers use the same label, help, and error classes as native fields and boolean controls.
Labels share uppercase text and weight, and help text and errors share typography and colors.
The wrappers preserve primitive props, custom elements, refs, events, IDs, and accessibility associations.
The shared class and hydration fixtures test reactive IDs, retained nodes, and conditional errors.
Browser tests compare typography across both themes and densities.
Option labels remain record values and retain their original case.

## Order of follow-up work

Table controls and normal consumer interfaces now use shared controls.
Overlay buttons now share the Button contract.
Common state styles now have shared owners.
Use the shared interaction matrix to prevent new divergence.
Repeated icons and current ownership documentation now use the shared implementation.

The original control, style, icon, and ownership documentation repairs are complete.
Choice metadata now shares field presentation in `wfe-w2y.25`.
Live stylesheet saves now have regression coverage in `wfe-w2y.24`.
Optional WAMN row presentation was tracked separately in `wfe-w2y.18` and is now complete.
Cross-browser appearance remains an additional qualification task.

## Live gallery review, October 19, 2026

Issue: `wfe-jbf`.

The review used HTML, served CSS and TSX, computed styles, and element sizes from the running gallery.
The capture covered all 17 gallery entries in dark mode and the combined form in both modes.
Local evidence remains in `/tmp/wfe-live-inspection` and `/tmp/wfe-live-inspection-after`.
The source index records 928 responses, including styles imported by multiple example entries.
This evidence covers Chromium and the rendered states, not every possible component composition.

`components.css` applied flexible sizing to every direct `data-ui` child of a filter input.
That selector also matched the calendar button and reduced its width to 21px.
The selector now excludes buttons.
`fields.css` gives owned icon accessories the control height as their width.
Combobox triggers retain their content width, including labels with an icon.
The field and its accessories share border, fill, hover, invalid, and readonly roles.

`states.css` gives readonly outputs and readonly inputs the same surface.
Compound fields use one outer focus outline, with an inner outline for accessory buttons reached by keyboard.
Focus outlines use `--ui-focus-width`, with a one-pixel default.
Selection buttons retain one solid border without a second inset stroke or a filled background.

`FormLayout.tsx` retains the accessible native legend and places the visible section title inside the border.
`form-layout.css` uses shared heading and spacing roles.
Standalone date labels use the shared label class.
The combined form uses a centered 30rem column that shrinks with its viewport.
Its sections use the content surface, while the main canvas has a slight neutral contrast.

Links use the accent without underlines.
Closed collapsible headings use muted text, while open headings use normal text.
The shared appearance uses a darker blue in both modes.
The approved appearance replaces action shadows with larger tilted trapezoids behind the controls.
The rectangles share the canvas dot pattern and gray tone.
Selected buttons, tabs, and sidebar links retain the backing rectangle after the pointer leaves.
Each pointer entry chooses a rotation of 0.5–2 degrees in either direction and a taper between −2 and +2 degrees.
Hovered and selected outline/ghost actions use transparent faces without a gray overlay.
The dotted backing extends six pixels beyond the control and uses a 20% gray outline.
The hover effect does not change layout or border width.

The final gallery audit covers all 17 catalog entries in light and dark modes, at desktop and phone widths.
The 68 captures contain served markup, loaded styles, computed geometry, and screenshots in `/tmp/wfe-final-screen-audit`.
No page overflow or browser exception appeared in that pass.
Independent visual review found invisible loading placeholders and different table filter label spacing.
Skeletons now use `--ui-skeleton-surface`, with the existing muted surface as the fallback.
Table control labels use the shared label style without passing label weight into their controls.
The gallery now places examples on solid panels above the shared dotted canvas.
The shared table now fills its container when no pixel width is supplied (`wfe-dw4`).
Explicit pixel widths retain their column sizing and scrolling behavior.

The generated examples now preserve the shared sizing profile through `LayoutView.style` (`wfe-8ur`).
Single-column forms use a centered 30rem limit, while multi-column forms retain their responsive grids.
Form controls use 32px height, and table cell controls retain 26px height within compact rows.
Generator panel shadows remain explicit example rules, while gallery panels use plain borders.
The audit does not treat these different example profiles as complete visual consistency.

The packaged virtual-selection test also failed intermittently during this audit.
Source, instrumented package, and the final unmodified package runs pass.
A deterministic test reproduced a stale anchor restoration after explicit navigation.
The adapter now cancels that restoration when navigation occurs.
The original browser failure remains unconfirmed and tracked as `wfe-47e`.
Failure-only geometry capture now preserves the scroll position and mounted row IDs without changing normal test timing.

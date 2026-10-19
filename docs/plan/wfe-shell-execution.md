# Shell, grid, tiles, and labels execution

This strategy implements the [owner draft](wfe-shell-grid-tiles.md) through the existing public packages.
The [feature catalog](../features.md) records the implemented baseline.
Beads remains the source of task status and dependencies.

## Delivery order

The chart port and tooltip repair are merged into `main` at `45faa4a`.
Documentation cleanup merged into `main` at `19bafcb` from `chore/repo-cleanup`.
The `feat/shell-grid-tiles` branch starts from that updated `main`.
The draft's `e4ff5bb` reference remains its historical baseline rather than the execution branch point.

Execute W1, W2, W3, W4, W5, W6, then W7.
W1 through W4 remain independent public additions.
Open one epic at a time, with no more than three issues per epic.
Report no more than 10 lines per epic.
Commit and push each qualified issue. Use a separate review agent for architecture and code quality.
Update the affected guides and this catalog's current API descriptions with each addition.

## Existing foundations

| Requirement                     | Existing foundation                                                                         | Required addition                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Responsive application frame    | `DashboardShell`, shared navigation/context rails, header/footer, and independent scrolling | Route-described composition in `@wfe/shell`               |
| Audience selector               | Controlled `SelectField`                                                                    | Description and accepted audience binding                 |
| Breadcrumbs                     | Public Breadcrumbs components                                                               | Resolve declared parent IDs and render application links  |
| Page title and navigation focus | Shared heading styles and existing gallery focus behavior                                   | Focus after accepted route changes, without a router      |
| Boolean grid                    | Shared controlled Checkbox and semantic HTML table                                          | `GridDescription`, keyed cells, and value/change bindings |
| Status tiles                    | Card, ValueDisplay, shared spacing and status tokens                                        | StatusTile and TileRow composition                        |
| Field and operation labels      | Existing required form/action labels and optional table column labels                       | Optional labels with deterministic accessible fallbacks   |
| Field display formats           | ValueDisplay and formatDisplayValue                                                         | Generator metadata integration and short-hash format      |

Preserve one implementation of each control, layout primitive, and formatter.
Do not move DashboardShell, breadcrumbs, or Checkbox into the new package.
No new vendor source or runtime/compiler upgrades belong to this work.

## W1: described shell

Create `@wfe/shell` as a private workspace package that depends on public component exports.
It composes DashboardShell, SelectField, Breadcrumbs, and shared typography and spacing.
The shell describes navigation and placement. It does not own application routes or address parsing.

The description supplies stable audience and route IDs, labels, declared breadcrumb parents, and view references.
Bindings supply accepted audience and route IDs, application hrefs, page content, and navigation callbacks.
The route table contains the navigation that the application chooses to expose.
Audience switching requests a change. The application accepts it and chooses any resulting route.
Rejected requests do not change the shell's accepted selection or page.

Links preserve native modified-click behavior and application-provided addresses.
The example owns browser history and uses push navigation with Back and Forward support.
The package never chooses replace navigation or parses those addresses.
The existing drawer remains the only navigation overlay implementation.

After an accepted route change, focus moves to the current page heading.
Initial rendering and hydration do not steal focus.
Narrow navigation closes after accepted navigation without overwriting heading focus.
Stable route IDs preserve unchanged view owners. Replaced views release their handlers and effects.

Use three issues: public contracts and workspace delivery, shell composition and interaction, then examples, qualification, and guides.
The example uses two invented audiences and six routes through public exports.
Test accepted/rejected requests, external route updates, breadcrumbs, modified clicks, Back/Forward, narrow drawers, keyboard focus, and disposal.
Test source, built-package, development, server rendering, and hydration inputs.
Extend package ownership and export guards to cover the new workspace.
Update the form, generator, layout, and adoption guides in the same epic.

## W2: boolean grid

Add GridDescription and GridView to the generator with separate application bindings.
Descriptions supply stable row/column keys, labels, read-only columns, and disabled rows.
Bindings supply accepted boolean cell values and one change-request callback.
The callback receives the row key, column key, and requested boolean value.
A cell change never emits a duplicate form or row submission.

Use a semantic table and shared controlled Checkbox.
Name each cell from its row and column labels.
Keep stable cell owners across accepted value changes and row/column reordering.
Read-only cells expose their state without requesting changes. Disabled rows prevent interaction.
Applications own permission decisions, saves, batching, and server failures.

Use no second table engine or form coordinator.
A 30 by 5 grid does not need a new virtual renderer.
Use up to three issues for contracts/rendering, interaction and controlled-state tests, then example/docs/qualification.
The example reports every accepted or rejected request through application code.

## W3: status tiles

Add StatusTile and TileRow to `@wfe/components` through existing Card and shared style roles.
StatusTile accepts a label, value, one-line detail, and ok/warning/unknown state.
Keep the raw value and its display format separate.
Use the existing semantic status roles and accessible text rather than a new palette.
Do not infer health, thresholds, availability, or polling from a value.

TileRow wraps at narrow widths and retains readable values.
Use one issue for components and contracts, then one for example, visual checks, and guides.
Test missing detail, long text, all states, shared appearance, narrow layouts, and hydration.

## W4: labels and display formats

Extend the existing description types rather than add a parallel field or action model.
Omitted labels fall back to their stable field or operation ID.
Existing CSS supplies uppercase system presentation without changing record values.
Keep explicit table header aliases above static description labels and existing column-header fallbacks.

Use the existing ValueDisplay path for date and boolean-symbol formats.
Add short-hash once in the shared value formatter, with a documented length and full-value access.
Formatting must not replace raw data used for identity, filtering, sorting, grouping, or submission.
Preserve the existing native copy interaction.
Keep existing date patterns, locale, timezone, date-only, and datetime semantics.
The owner must resolve the editable-field question below before W4 implementation.

Use up to three issues for optional-label fallbacks, shared formatting and generated views, then examples/docs/qualification.
Update form, generator, layout, and adoption guides as the affected contracts change.
Test type compatibility, fallback names, full/raw values, custom renderers, both generated views, and hydration.

## W5: repeated form groups

Extend FormDescription with a repeated group field whose rows contain scalar fields.
Keep ordinary scalar forms compatible and reuse the existing field controls and validation presentation.
Applications supply accepted row values, stable row keys, errors for each row, and add/remove change decisions.
Keep record persistence and validation rules in application callbacks.
Preserve row identity and drafts when another row changes or moves.
Associate row errors with their fields and prevent duplicate submission callbacks.
Optional field labels default to the field key, consistent with W4.

Use at most three issues for contracts, repeated-row rendering and interaction, then the example and qualification.
The example submits one repeated group and presents an error for a row.
Update the generator contract in the same change.
Test controlled rejection, additions/removals, stable keys, error associations, submission snapshots, and hydration.

## W6: detail and delete descriptions

Add DetailDescription for one record with read-only formatted fields and actions.
Compose the existing formatter, field layout, and action controls in DetailView.
Keep record data and action callbacks in application bindings.

Add DeleteDescription for one record key, confirmation, and one application callback.
Compose existing confirmation components in DeleteView.
The application performs deletion and owns its result.
The view never infers a transport request, permission, route change, or persistence rule.

Use at most three issues for detail contracts/view, delete contracts/view, then examples and qualification.
Each view requires an example and tests, including focus, cancellation, callback count, and hydration.
Update the generator contract in the same change.

## W7: release record

Create one release issue only after W1 through W6 pass their acceptance criteria.
Update the adoption guide with the approved tag and the six additions.
Tag the integrated commit after the reviewed work reaches `main`.
Do not publish packages or invent a version/tag convention.

## Remaining owner decisions

- For FormView, do formats apply only to read-only values, while editable fields retain their current controls and raw values?
- What release tag must W7 use? The current packages are private at version `0.0.0`.

The branch baseline decision is resolved: merge charts first, merge cleanup second, then branch for implementation.
These remaining decisions do not block W1 through W3.

## Qualification

Run the required repository gates before each commit.
Run meaningful unit and browser cases for the changed behavior.
Use the existing serial source/package/development matrix and server/hydration checks.
Retain failed reports and make sure that disposal releases views, focus references, listeners, and overlays.
Check public declarations and import ownership for the new shell workspace.
Keep performance campaigns separate because machine load varies.
Preserve existing review servers until replacement previews pass.

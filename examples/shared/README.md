# Shared example support

This directory contains appearance controls, browser review helpers, and diagnostic policies used by multiple examples.
It is support code, not an independently served application or a public package.
Consumer fixtures import its helpers and own their records and callbacks.

See [the example inventory](../README.md) for runnable fixtures.
Use public package exports in application examples. Keep fixture-only helpers here.

## Fixture disposal

`createFixtureDisposal` in `fixtureDisposal.ts` owns the generator-action boundary required by `wfe-0dj.4`.
Pass a callback that invokes the fixture's current root disposer. Call the returned function, then keep the fixture's existing `flush()` outside the action.
The helper does not mount, hydrate, flush, clear references, or suppress repeated calls.
Fixtures still own those operations, their optional-release guards, and their diagnostic capture boundaries.
In particular, editing, read-only, analytics, and WAMN fixtures do other shutdown work between disposal and flush. Preserve that order.

The consumers are the components, charts, grid, shell, status-tiles, platform, dashboard, layout, analytics, table-read-only, WAMN, date-picker, and shared hydration client entries, plus the generator, WAMN generator, form-contract, and table-editing fixture factories.
Both date-picker client entries use the helper. The components entry uses it for every exposed root shutdown path; its consumer branch retains its repeated-stop guard.
Browser rendering and hydration stay explicit in their entries. Awaited hydration still installs its release only after hydration finishes. Server rendering entries do not import this helper.

Child-table actions in `table-editing/createSubTables.ts` also abort work and publish counts; they retain their own action and flush boundaries.
The editing-overhead diagnostic retains its independent wrapper so its measured scopes stay unchanged.
Unit harnesses and the runtime-only `bench/action-disposal` reproduction also remain independent.
The reproduction's actual heap checks are still required evidence for disposal retention; these helper tests do not replace them or justify removing the workaround.

## Example boundaries

Reusable presentation belongs here, not in another example application's directory.
The gallery and generator share `controls/ColumnControlsApp.tsx` and `controls/SubTables.tsx`.
The gallery and hydration fixture share `controls/MatchingCombobox.tsx`; gallery-only composition and catalog state remain in the gallery.
The theme entry, gallery, and hydration fixture share `appearance/ThemeConsumer.tsx` and `appearance/theme-review.mjs`.
`editingFields.ts` owns the demo field keys and labels used by editing and popup examples. It does not import the editing application.
These modules retain public package imports and their existing callbacks. They do not import a consumer's stylesheet.

`scripts/check-example-boundaries.mjs` checks static imports, reexports, dynamic imports with literal paths, import types, and CSS imports.
The existing control integrity check invokes it. It rejects sibling application imports, shared support that imports back into an application, and private imports into components, form, generator, or shell.
Common files directly under `examples`, such as the Vite configuration and fixture stylesheet, remain shared infrastructure.

The exact exception registry distinguishes suite-owned test harnesses from reusable application presentation.
The components fixture reuses the editing fixture entry and three browser case modules to test popup interoperability against the same behavior.
The editing-overhead diagnostic measures the real editing model, controller, validation, and table; extracting a substitute would change its measurement target.
The WAMN generator integration reuses the prepared snapshot, owned transport adapter, and explicit generator runner override API.
Each permitted source/import pair has a reason. No directory is exempt, private package imports remain prohibited, and an unused exception fails the check.
These exceptions do not permit gallery/generator application imports or foreign application stylesheets.

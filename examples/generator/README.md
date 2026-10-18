# Generator example

This example composes `FormView`, `TableView`, and `LayoutView` through public package imports.
The application owns accepted values, validation, actions, rows, and table state.
The default records application uses `/?app=records`.
Its table fills the main panel. Application-provided View and Edit actions open separate record screens.
The readonly screen uses display components. The editor uses the generated form, including grouped fields and numeric input.
Records stay in this example's memory and reset on a full reload.
A save updates only the selected stable record ID. Reset uses the latest saved values.
Leaving a record cancels pending work and discards unsaved edits.
Browser Back and Forward use pushed URLs. They preserve the mounted table, its scroll position, and its configured sorting and columns.
Direct `screen=view` and `screen=edit` URLs with a `record` ID render the same screen on the server and client.
Unknown IDs show a readonly error with a Records action.

`/?app=records&reviewCells=1` enables the separate regression screen.
Only this explicit mode shows description/reorder/removal controls and a custom cell draft input.
Its existing ownership and disposal tests remain intact.

The dispatch application uses `/?app=dispatch`.
Each application owns a separate provider, form contract, table, and descriptions.
Both applications use unchanged generic packages.
All generator routes use the shared light appearance: Surface 1 components, a Surface 2 backdrop, shadow depth 2, and blue outline buttons.
Client rendering and server hydration share one appearance scope.

The regression editor's optional numeric field starts without a value and uses an application wrapper around the shared NumberInput.
The dispatch nullable amount uses the built-in generated number control.
Both preserve incomplete drafts and prevent UI submission of an older accepted number.
Applications retain domain validation and saving.
The regression mode retains a local cell draft while the application replaces its row.
The browser suites explicitly enable it, and server rendering uses the same mode as hydration.

From the repository root, build the packages before you start the preview:

```sh
pnpm build
pnpm exec vite --config examples/generator/vite.config.ts --host 127.0.0.1 --port 7788 --strictPort
```

The regression editor uses named Record details and Preferences groups through the shared form layout.
Groups and fields stack according to their panel width. Name spans the available columns, and Notes spans two columns on wide groups.
In review mode, the description action changes labels, group order, field order, panel order, aliases, callbacks, and column order.
The removal action disposes the editor's controls.
The application keeps the existing form coordinator and table engine.

Run the browser cases after a fixture build:

```sh
pnpm exec vite build --config examples/generator/vite.config.ts
node examples/generator/run.mjs
node examples/generator/run-hydration.mjs
```

Set `BENCH_DISTRIBUTION=1` for distribution imports.
Set `BENCH_DEVELOPMENT=1` with `NODE_ENV=development` for development source imports.
Use the same environment for the fixture build and browser command.
The regular qualification command includes all three modes and hydration.

The regression screen reserves a minimum height for its records panel on narrow screens.
Its custom cell contains a text control, so it needs more room than a plain text row.
The application stylesheet owns this minimum.
The shared renderer keeps the table height stable when the result count changes.

The dispatch form uses tracking codes, carriers, insurance, a nullable amount, and a date.
Its table uses a computed route column and formats integer cents as dollars.
The application places its editor in navigation and its records in the main panel.
Reply mode selects accepted replies, field errors, form errors, or service failures.
The browser fixture can hold validation or save replies and complete them without timers.
The suite completes held replies after cancellation, accepted value replacement, removal, and disposal.
It requires unchanged records and no browser errors or reactive diagnostics.
Removing the dispatch editor explicitly cancels its application-owned form.
Removing a generated view alone does not dispose an application-owned coordinator.

Both applications run in every browser and hydration mode through one shared harness.
The provider unit tests also reject nonfinite amounts and invalid calendar dates.

The date input application uses `/?app=dates`.
It shows a date-only field and two datetime fields with explicit and browser timezones.
The display controls change numeric date formats, 12-hour or 24-hour time, and the application timezone.
The accepted values remain canonical strings.
The application owns validation and submission.
Invalid local date text prevents the generated view from submitting an older accepted value.

The date application also shows shared read-only output in a table, detail values, and a summary.
Date and timestamp column controls select configured output, legacy date formats, or UTC ISO timestamps.
All consumers use the same display choices.
Formatting leaves raw records, sorting, filtering, and export data unchanged.

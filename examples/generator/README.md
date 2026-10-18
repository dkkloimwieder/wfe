# Generator example

This example composes `FormView`, `TableView`, and `LayoutView` through public package imports.
The application owns accepted values, validation, actions, rows, and table state.
The default records application uses `/?app=records`.
The dispatch application uses `/?app=dispatch`.
Each application owns a separate provider, form contract, table, and descriptions.
Both applications use unchanged generic packages.

The optional numeric field starts without a value and uses an application wrapper around the shared NumberInput.
The dispatch nullable amount uses the built-in generated number control.
Both preserve incomplete drafts and prevent UI submission of an older accepted number.
Applications retain domain validation and saving.
The custom table cell retains a local draft while the application replaces its row.

From the repository root, build the packages before you start the preview:

```sh
pnpm build
pnpm exec vite --config examples/generator/vite.config.ts --host 127.0.0.1 --port 7788 --strictPort
```

The records editor uses named Record details and Preferences groups through the shared form layout.
Groups and fields stack according to their panel width. Name spans the available columns, and Notes spans two columns on wide groups.
The description action changes labels, group order, field order, panel order, aliases, callbacks, and column order.
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

This example reserves a minimum height for its records panel on narrow screens.
Its custom record cell contains a text control, so it needs more room than a plain text row.
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

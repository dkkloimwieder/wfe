# WAMN generator adapter

This optional fixture adapts the prepared Widget bindings to the public form, table, and layout views.
It keeps WAMN metadata and operations inside the integration example.
It does not change production WAMN code or generic package internals.

The adapter reads the existing definition and screen labels under `examples/wamn/.input`.
It imports generated operation bindings and the copied runtime, but no generated UI components.
The projection supports the six Widget columns and a flat code/note editor.
It rejects unknown operations, fields, choices, column types, duplicate identities, and revision mappings.
The generated update request type also constrains the editor's values.
Optional, nullable notes map to a string draft in this application.
An empty draft sends an empty string.
The adapter does not infer forms from nested command mappings.

The original variant uses the prepared column labels and order.
The review variant changes labels, choices, field order, column order, and action labels.
Both variants keep their field, column, action, and screen identities.
The application updates the existing table order explicitly.

The preview uses the shared Light palette and Blue accent.
Buttons and icon actions use outlines.
Components use Surface 1, and the page uses Surface 2.
Panels use shadow depth 1.
The records screen gives the table the full main panel.
Each row supplies View and Edit actions.
Edit opens that record in the existing form on its own screen.
View opens read-only details through the generated get operation.
Inspection keeps its target separate from the editing draft.
Back to records keeps the draft, and Cancel discards it.
The screens retain their form and table owners across navigation.
Navigation pushes URL entries without replacing browser history.
Browser Back and Forward restore the screen and record identity.
A different editing target remains blocked while a draft is dirty or a save is pending.
Invalid direct record links show the table with an error.
Short editor screens scroll vertically, and long table values scroll horizontally inside the table.

Initial column widths follow field types and the approved compact typography.
The preview does not scan query results to calculate widths.
Header separators support pointer and keyboard resizing through the shared control and native engine.
Identifier cells stay on one line and use an ellipsis when the user makes a column narrower.

The fixture starts with two deterministic records.
Refresh runs the generated Widget query binding through the existing mock HTTP transport.
View runs the generated Widget get binding for that row ID.
Save runs the generated update binding with the selected record's exact revision string.
The application blocks a different editing target while a draft is dirty or a save is pending.
Returning to the same target preserves its draft.
A new inspection clears the previous details and rejects older or mismatched replies.
A list refresh that omits the editing target reports an error and retains the previous records.
The real encoder and decoder process all three operations.
The existing mock transport supplies replies without a WAMN server.
The adapter converts refusals to form errors and permits retries.
It retains one committed record collection and a separate accepted form draft.

Refresh refuses to replace a dirty or pending draft.
Accepted edits and saves invalidate earlier reads before they can publish.
The abort signal prevents a cancelled save from publishing records into the client.
Cancellation does not undo a write that the server already accepts.
A later refresh reads that result through the normal query binding.
Disposal releases held mock requests and prevents late publication.

From the repository root, use the existing prepared inputs:

```sh
node examples/wamn/check-inputs.mjs
pnpm build
pnpm exec tsc --project examples/wamn-generator/tsconfig.json
pnpm exec vite build --config examples/wamn-generator/vite.config.ts
node examples/wamn-generator/run.mjs
node examples/wamn-generator/run.mjs --hydration
```

The input command compares every prepared hash with its provenance record.
It does not compile Rust or modify the WAMN checkout.
If the prepared inputs are absent, follow the preparation steps in the existing WAMN example first.
Default repository checks do not require those ignored inputs.
The optional `pnpm test:qualification --wamn` path includes this fixture.

For manual review, start Vite from the repository root:

```sh
pnpm exec vite --config examples/wamn-generator/vite.config.ts --host 127.0.0.1 --port 7789 --strictPort
```

Open `/?app=original` or `/?app=review` on that preview.
Set `BENCH_DISTRIBUTION=1` for package imports.
Set `BENCH_DEVELOPMENT=1` and `NODE_ENV=development` for development source imports.
Use the same environment for the fixture build and browser command.
The shared harness tests both variants and preserves per-variant results.
It also tests server labels, hydration identity, keyboard focus, refusals, stale replies, and cleanup.

Production integration still needs real transport configuration, permissions, broader field mappings, and command-specific adapters.
This fixture does not claim production support for nested forms or arbitrary WAMN schemas.

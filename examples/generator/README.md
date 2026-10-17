# Generator example

This example composes `FormView`, `TableView`, and `LayoutView` through public package imports.
The application owns accepted values, validation, actions, rows, and table state.
The optional numeric field starts without a value and uses an application component.
The custom table cell retains a local draft while the application replaces its row.

From the repository root, build the packages before you start the preview:

```sh
pnpm build
pnpm exec vite --config examples/generator/vite.config.ts --host 127.0.0.1 --port 7788 --strictPort
```

The description action changes labels, field order, panel order, aliases, callbacks, and column order.
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

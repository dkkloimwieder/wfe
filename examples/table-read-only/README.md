# Read-only Table

This demo uses the shared Table presentation with sorting, column filters, search, nested grouping, and group summaries.
It also supports column visibility and ordering. It creates no editing model, drafts, validation state, or save controller.
The application supplies the native Table, its columns, and its records.
Replacing the source updates the displayed values and preserves Table configuration.

The shared component is exported from `@wfe/components/table`.
The editing and analytics demos use the same table structure and read-only row renderer.
Analytics keeps filtering and search disabled for complete query exports.

## Run

From the repository root, start the demo on port 7784:

```sh
pnpm exec vite --config examples/table-read-only/vite.config.ts --host 127.0.0.1 --port 7784
```

Open `http://127.0.0.1:7784`.

Install Playwright Chromium before the browser test. From the repository root, build and test the demo:

```sh
pnpm exec vite build --config examples/table-read-only/vite.config.ts
pnpm exec node examples/table-read-only/run.mjs
```

Use `BENCH_DISTRIBUTION=1` for both commands after a package build to test package imports.
Use `NODE_ENV=development BENCH_DEVELOPMENT=1` for both commands to include runtime diagnostics.
The Solid qualification command includes the source and distribution tests.
The browser test also makes sure that the bundle excludes editing code, the UI accepts source replacements, and disposal removes its DOM.

Open `http://127.0.0.1:7784/?pagination` for the paged mock.
The mock application owns the accepted page, page size, request state, and total.
It supplies one page to `ReadOnlyTable` and handles callbacks from the pinned footer.
The mock slices its local data to simulate a server response. The library does not slice records.
The browser and hydration cases also exercise held responses, rejection, unknown totals, empty pages, keyboard actions, and narrow screens.

Open `?messages` for the complete Spanish table messages example.
Use English / Español to change language while keeping the table and filter drafts mounted.
`messages.es.ts` satisfies every member of the public `TableMessages` contract.
The browser runner checks message forwarding and retained draft controls in source and built-package modes.

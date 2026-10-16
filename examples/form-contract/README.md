# Form contract example

This example defines the first form API before the reusable package implementation.
Read [the contract](../../docs/form-contract.md) for ownership, reset, validation, submission, and cancellation rules.
The application owns accepted values and defaults.
The concrete reference coordinates only its three fields.
Shared controls provide all field markup and behavior.

From the repository root, start the example:

```sh
pnpm exec vite --config examples/form-contract/vite.config.ts --host 127.0.0.1 --port 7787 --strictPort
```

Open `http://127.0.0.1:7787/`.
SAVE is explicit. Enter in another field does not submit.
Use the example service controls to pause or reject a response.
LOAD OTHER RECORD replaces values and defaults through the application.
No changes are persisted.

The appearance controls match the Table example.
Choose neutral surfaces, an accent, shadow depth, and separate Base, Panes, and Content surfaces.
Appearance changes preserve field values, errors, and pending requests.
Both examples share the controls and Open Props samples in `examples/shared/appearance`.
Table placement and divider controls stay in the Table example.

Build and test the browser example:

```sh
pnpm exec vite build --config examples/form-contract/vite.config.ts
node examples/form-contract/run.mjs
```

Set `BENCH_DISTRIBUTION=1` on both commands for the built package.
Set `NODE_ENV=development` and `BENCH_DEVELOPMENT=1` on both commands for development behavior.
Run these modes serially on the shared host.

Run the focused contract tests:

```sh
pnpm exec vitest run tests/unit/form-contract.test.ts
```

The proposed types stay local to this example until `wfe-w2y.3.2` implements `@wfe/form`.

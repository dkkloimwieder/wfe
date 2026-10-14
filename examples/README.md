# Examples

Run every command from the wfe repository root.
Install dependencies with `pnpm install --frozen-lockfile`.
Build components with `pnpm build` before testing the built package.

## Preview

Start the component consumer on port 7785:

```sh
pnpm exec vite --config examples/components/vite.config.ts --host 127.0.0.1 --port 7785
```

Open `http://127.0.0.1:7785/?consumer=1`.
Use the same command with another example configuration and an unused port.
Existing previews on ports 7777 and 7782 through 7784 stay available during migration.

The generic examples are components, table-editing, table-read-only, analytics, styles, and virtualization.
Each example imports public exports from `@wfe/components`.
Applications own records, transport, validation, query paging, cache policy, and export requests.
The optional WAMN example requires its separate input preparation.

## Browser cases

Install Chromium with `pnpm exec playwright install chromium`.
Build and test an example:

```sh
pnpm exec vite build --config examples/components/vite.config.ts
node examples/components/run.mjs
```

Set `BENCH_DISTRIBUTION=1` for both commands to test the built package.
The source mode uses the public `wfe-source` export condition.
The built mode uses the public `solid` export condition.
Run heavy browser suites serially.
Set `BENCH_WORKLOADS=0` for editing cases to omit optional performance workloads.
Set `BENCH_OUTPUT` to preserve each browser report at a separate path.

# Qualification

Run these commands from the repository root. The [root README](../README.md) lists the Node and pnpm versions for development. Library package manifests declare their separate consumer engine range, `>=22.12.0`.

## Install the tools

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
```

The workspace uses TypeScript 7.0.2, Vitest 5.1.0, Vite 8.3.8, tsdown 0.23.5, and one Rolldown 1.2.19. The lint gate uses Oxlint 1.94.0. The `pnpm lint` script runs the syntax pass, then invokes `pnpm lint:types` as a separate pass through Oxlint Tsgolint 7.0.2007. You can run `pnpm lint:types` on its own.

## Package builds

Run `pnpm build` to rebuild all five packages in dependency order. JSX packages expose declarations, preserved JSX, and server and client output. Form and Sync expose declarations and JavaScript. If pnpm invokes a package's `prepare` script, the script reuses existing output only when its input hash matches. The hash covers package source, configuration, declared build inputs, and workspace dependency hashes. Run an explicit build after changing source if a repeat install skips prepare.

## Run the commit gate

```sh
pnpm check
```

| Command               | Coverage                                                                |
| --------------------- | ----------------------------------------------------------------------- |
| `pnpm format:check`   | Repository formatting.                                                  |
| `pnpm lint`           | Oxlint syntax rules, followed by the separate type-aware pass.          |
| `pnpm test:integrity` | Theme tokens, controls, imports, generated icons, and vendor integrity. |
| `pnpm build`          | Workspace package output.                                               |
| `pnpm test:consumers` | Package exports and strict external consumers.                          |
| `pnpm types`          | Package type checks.                                                    |
| `pnpm types:unit`     | Unit test type checks.                                                  |
| `pnpm types:examples` | Type checks for example projects in the inventory.                      |
| `pnpm test:unit`      | Unit behavior in Vitest. The gate sets `NODE_ENV=test`.                 |
| `pnpm test:ssr`       | Server rendering.                                                       |
| `pnpm test:contracts` | TypeScript examples in Markdown and separate type contracts.            |
| `pnpm test`           | Node repository and tooling tests. Node runs these files one at a time. |

The gate runs these stages in order and stops on failure. The [coverage inventory](../scripts/coverage-inventory.mjs) lists example runners, type projects, Markdown fences, and type contracts. Its test detects missing entries and changed fence counts. The documentation compiler reports each source path and fence number.

## Run serial qualification

Run qualification for changes to runtime behavior, exports, rendering, hydration, or vendor code. Hydration attaches client behavior to server-rendered HTML.

```sh
pnpm test:qualification
```

Inspect the stage plan without running the checks.

```sh
node scripts/qualify.mjs --plan
```

| Stage group                           | Coverage                                                                                                                                               |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Commit gate                           | Starts with `pnpm check`, which already includes the unit suite.                                                                                       |
| Standalone checks                     | Run the direct source tests, analytics server tests, Theme and Theme Explorer browser tests, import guards, and vendor bundle audit.                   |
| Example builds and browser tests      | Cover source, built-package, and development modes where the inventory classifies them as required.                                                    |
| Hydration                             | Test retained server markup, state updates, focus, interaction, and cleanup.                                                                           |
| Live components and preview isolation | Test hot updates, browser interaction, diagnostics, and concurrent preview servers.                                                                    |
| Optional WAMN                         | Run prepared integration inputs with `pnpm test:qualification --wamn`. Prepare the inputs with the [fixture instructions](../examples/README.md#wamn). |

The runner executes stages one at a time and stops at the first failure. It clears inherited case selectors, preview URLs, and performance flags. It preserves `BENCH_EXECUTABLE_PATH` for a specific Chromium executable. Set `PLAYWRIGHT_BROWSERS_PATH` to use an existing browser installation.

The Node boundary jobs run the commit gate and direct source test at 22.22.2, 24.15.0, and 26.0.0. The browser qualification job runs on Node 24. See the [CI workflow](../.github/workflows/check.yml).

## Review run artifacts

Each qualification run creates a directory under `test-results/runs/qualification` for its logs, browser reports, and stage summary. Set `QUALIFICATION_OUTPUT` to select a different parent directory. Each invocation still creates a separate run directory.

Shared browser runners create `manifest.json` and `report.json` under `test-results/runs`. The manifest records revision, execution settings, runtime and browser information, and outcome. Screenshots and requested heap captures use the same run directory. Sync uses its own report writer. Choose a fresh path for any explicit capture destination because the runner rejects an existing file.

GitHub Actions uploads `test-results/runs` after qualification, including on failure. Local runs keep earlier reports.

## Run focused diagnostics

Use the [example instructions](../examples/README.md) for individual browser runners. Performance runs use separate [benchmark tools](../bench/README.md). The native-tab and disposal reproductions also run separately from the gates.

```sh
node scripts/reproduce-native-tab.mjs
node scripts/reproduce-action-disposal.mjs
```

Set `NATIVE_TAB_MODE` to `loopback`, `fetch`, or `fulfill` to compare how Chromium opens a native link. Use `BENCH_OUTPUT` for a fresh report path. Use `DISPOSAL_OUTPUT` for a fresh directory for the disposal reproduction.

The vendor integrity stage compares captured files and installed patches with recorded hashes and import boundaries. See [vendor repair replay](vendor-repair-replay.md) and the [dependency patch records](../patches/README.md).

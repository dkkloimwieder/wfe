# Epic 5b close report: built packages

Epic wfe-w2y.40 is complete. Main is fast-forwarded to the commit that adds this report. The last `pnpm check` passed with 120 test files and 1139 tests. The full qualification did not pass in one run. The last run passed 50 stages and then failed at stage 51, `hydration-source`, with the known new-tab timeout of open issue wfe-x6o: "Native click did not open a tab within 30000ms". Epic 5b does not change that check. The owner accepted this result and closed the epic, because the host load stays high.

The commits are:

- 4f0f19d: issue .1, the consumer fixtures
- e28f795: issue .2, form and sync
- 53e5813: issue .3, components, generator and shell
- 1f220e4: issue .4, prepare and the build tools
- c383300: bug .6, the named re-exports of a Kobalte barrel
- c51e5e7: bug .7, the layout runner waits for the settled shell

## Owner decisions

The brief named three conditions: `types`, `solid` and `default`. The owner then decided these points:

1. Each entry of a JSX package keeps `"node"` for plain Node server rendering. The order is `types`, `wfe-source`, `solid`, `node`, `default`. Each package README states this exception.
2. `wfe-source` stays for wfe's own examples and checks. Thirteen example runners and the chart import check need it. No consumer fixture sets it.
3. tsdown builds separate modules (unbundle). `./styles.css` is a plain asset export with `default` only. A tsdown build with preserved JSX writes the `.jsx` files and replaces `scripts/build-source.mjs`.
4. Each package declares the build tools that it needs, at the pins of the wfe root.

## Deviations

1. The fresh consumer install measurement did not run. The owner stopped it as a waste of resources, because the host load was high and varied. The only install number is from wfe's own install, below.
2. Every preserved module is a `.jsx` file. This includes the barrels and other modules that come from `.ts` files. So `dist/index.jsx` exists for each JSX package.
3. The packages keep `"wfe-source"` between `"types"` and `"solid"`. It must come before `"solid"` to win in source mode.
4. form and sync have no JSX, so they export `types`, `wfe-source` and `default` only. Their `dist/worker.js` still contains no import statement, so the classic service worker loads it.
5. The Vite consumer fixture is stricter than the brief. A module of a JSX package must resolve to a `.jsx` or `.css` file. It must never resolve to the compiled client or server build or to the source.
6. Each package README gets a "Package exports" section. components and generator had no README before, so they get their first one.
7. The pnpm store lacked one tarball, `natural-compare@1.4.0`, that the offline install needed. One online install fetched it at its locked version. Every resolved version in the lockfile stays the same. The Solid peers that pnpm added on its own are now listed dev dependencies.
8. Claude kept the dated `docs/structure-audit-2026-10-22.md` as it was, after Codex changed one of its findings. `docs/audit-low-dispositions.md` names the new declaration path.
9. A full qualification run failed at stage `table-editing-distribution-browser`. The vendored Kobalte barrel `core/src/primitives/index.ts` used `export * from '@solid-primitives/controlled-signal'`. Rolldown built that line as a runtime namespace re-export, so consumer bundles kept the barrel. Bug .6 replaced the line with named re-exports of the two names in use. The Kobalte README records this local repair, and `provenance.json` holds the new local hash.
10. Five full qualification runs took place. Run 1 failed because a local loopback shim loaded Playwright twice. Run 2 failed on the barrel of deviation 9. Run 3 failed in its gate stage, because a unit test timed out at a load average of about 23. Run 4 failed at `layout-source-browser`, because a case read the width of main before the narrow shell settled. This race is older than 5b. Bug .7 makes the case wait with `expect.poll`. Run 5 failed on wfe-x6o, as the first paragraph states.

## Build cost

The host load average was about 22 during these runs, so the times are rough single measurements.

The build times of `pnpm --filter <package> build`, before and after issue .3:

| Package    | Before | After  |
| ---------- | ------ | ------ |
| components | 32.1 s | 18.3 s |
| generator  | 9.7 s  | 4.2 s  |
| shell      | 6.9 s  | 8.6 s  |
| form       | 3.2 s  | 2.2 s  |
| sync       | 5.6 s  | 3.5 s  |

wfe's own install runs the five `prepare` builds. It took 22.9 s online and 23.7 s offline with the frozen lockfile. pnpm builds form, sync and components first, and generator and shell after components.

The `prepare` log of the online install shows these tsdown times:

| Package    | tsdown time                                    |
| ---------- | ---------------------------------------------- |
| form       | 4.1 s                                          |
| sync       | 5.9 s                                          |
| components | 10.7 s, 10.7 s and 12.7 s, one for each config |
| generator  | 5.3 s                                          |
| shell      | 3.8 s                                          |

## Exports of every package

The table lists the files under `dist`. Each JavaScript entry also has `wfe-source` pointing at its file under `src`.

### @wfe/components

Conditions used: `types`, `wfe-source`, `solid`, `node`, `default`.

| Subpath           | types                          | solid                         | node                                | default                      |
| ----------------- | ------------------------------ | ----------------------------- | ----------------------------------- | ---------------------------- |
| `.`               | `index.d.ts`                   | `index.jsx`                   | `server/index.js`                   | `index.js`                   |
| `./styles.css`    |                                |                               |                                     | `styles/styles.css`          |
| `./density`       | `styles/density.d.ts`          | `styles/density.jsx`          | `server/styles/density.js`          | `styles/density.js`          |
| `./table`         | `table/index.d.ts`             | `table/index.jsx`             | `server/table/index.js`             | `table/index.js`             |
| `./events`        | `utils/nativeEvents.d.ts`      | `utils/nativeEvents.jsx`      | `server/utils/nativeEvents.js`      | `utils/nativeEvents.js`      |
| `./virtual`       | `virtual/index.d.ts`           | `virtual/index.jsx`           | `server/virtual/index.js`           | `virtual/index.js`           |
| `./select`        | `components/Select.d.ts`       | `components/Select.jsx`       | `server/components/Select.js`       | `components/Select.js`       |
| `./combobox`      | `components/Combobox.d.ts`     | `components/Combobox.jsx`     | `server/components/Combobox.js`     | `components/Combobox.js`     |
| `./fields`        | `components/NativeFields.d.ts` | `components/NativeFields.jsx` | `server/components/NativeFields.js` | `components/NativeFields.js` |
| `./checkbox`      | `components/Checkbox.d.ts`     | `components/Checkbox.jsx`     | `server/components/Checkbox.js`     | `components/Checkbox.js`     |
| `./switch`        | `components/Switch.d.ts`       | `components/Switch.jsx`       | `server/components/Switch.js`       | `components/Switch.js`       |
| `./radio-group`   | `components/RadioGroup.d.ts`   | `components/RadioGroup.jsx`   | `server/components/RadioGroup.js`   | `components/RadioGroup.js`   |
| `./dialog`        | `components/Dialog.d.ts`       | `components/Dialog.jsx`       | `server/components/Dialog.js`       | `components/Dialog.js`       |
| `./alert-dialog`  | `components/AlertDialog.d.ts`  | `components/AlertDialog.jsx`  | `server/components/AlertDialog.js`  | `components/AlertDialog.js`  |
| `./sheet`         | `components/Sheet.d.ts`        | `components/Sheet.jsx`        | `server/components/Sheet.js`        | `components/Sheet.js`        |
| `./popover`       | `components/Popover.d.ts`      | `components/Popover.jsx`      | `server/components/Popover.js`      | `components/Popover.js`      |
| `./dropdown-menu` | `components/DropdownMenu.d.ts` | `components/DropdownMenu.jsx` | `server/components/DropdownMenu.js` | `components/DropdownMenu.js` |
| `./tooltip`       | `components/Tooltip.d.ts`      | `components/Tooltip.jsx`      | `server/components/Tooltip.js`      | `components/Tooltip.js`      |
| `./display`       | `components/Display.d.ts`      | `components/Display.jsx`      | `server/components/Display.js`      | `components/Display.js`      |
| `./toast`         | `components/Toast.d.ts`        | `components/Toast.jsx`        | `server/components/Toast.js`        | `components/Toast.js`        |
| `./layout`        | `layout/index.d.ts`            | `layout/index.jsx`            | `server/layout/index.js`            | `layout/index.js`            |
| `./collapsible`   | `components/Collapsible.d.ts`  | `components/Collapsible.jsx`  | `server/components/Collapsible.js`  | `components/Collapsible.js`  |
| `./number-input`  | `components/NumberInput.d.ts`  | `components/NumberInput.jsx`  | `server/components/NumberInput.js`  | `components/NumberInput.js`  |
| `./tabs`          | `components/Tabs.d.ts`         | `components/Tabs.jsx`         | `server/components/Tabs.js`         | `components/Tabs.js`         |
| `./breadcrumbs`   | `components/Breadcrumbs.d.ts`  | `components/Breadcrumbs.jsx`  | `server/components/Breadcrumbs.js`  | `components/Breadcrumbs.js`  |
| `./accordion`     | `components/Accordion.d.ts`    | `components/Accordion.jsx`    | `server/components/Accordion.js`    | `components/Accordion.js`    |
| `./resizable`     | `components/Resizable.d.ts`    | `components/Resizable.jsx`    | `server/components/Resizable.js`    | `components/Resizable.js`    |
| `./file-input`    | `components/FileInput.d.ts`    | `components/FileInput.jsx`    | `server/components/FileInput.js`    | `components/FileInput.js`    |
| `./chart`         | `chart/index.d.ts`             | `chart/index.jsx`             | `server/chart/index.js`             | `chart/index.js`             |
| `./theme`         | `theme/index.d.ts`             | `theme/index.jsx`             | `server/theme/index.js`             | `theme/index.js`             |
| `./search`        | `search/index.d.ts`            | `search/index.jsx`            | `server/search/index.js`            | `search/index.js`            |
| `./icons`         | `icons/index.d.ts`             | `icons/index.jsx`             | `server/icons/index.js`             | `icons/index.js`             |

### @wfe/form

Conditions used: `types`, `wfe-source`, `default`.

| Subpath | types        | solid | node | default    |
| ------- | ------------ | ----- | ---- | ---------- |
| `.`     | `index.d.ts` |       |      | `index.js` |

### @wfe/generator

Conditions used: `types`, `wfe-source`, `solid`, `node`, `default`.

| Subpath   | types              | solid             | node                    | default          |
| --------- | ------------------ | ----------------- | ----------------------- | ---------------- |
| `.`       | `index.d.ts`       | `index.jsx`       | `server/index.js`       | `index.js`       |
| `./chart` | `chart/index.d.ts` | `chart/index.jsx` | `server/chart/index.js` | `chart/index.js` |

### @wfe/shell

Conditions used: `types`, `wfe-source`, `solid`, `node`, `default`.

| Subpath | types        | solid       | node              | default    |
| ------- | ------------ | ----------- | ----------------- | ---------- |
| `.`     | `index.d.ts` | `index.jsx` | `server/index.js` | `index.js` |

### @wfe/sync

Conditions used: `types`, `wfe-source`, `default`.

| Subpath      | types           | solid | node | default       |
| ------------ | --------------- | ----- | ---- | ------------- |
| `.`          | `index.d.ts`    |       |      | `index.js`    |
| `./worker`   | `worker.d.ts`   |       |      | `worker.js`   |
| `./internal` | `internal.d.ts` |       |      | `internal.js` |

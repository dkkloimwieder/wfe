# Drag and drop examples

Run commands from the repository root after installing dependencies.
The standalone page shows the shared
[board example](../shared/drag-and-drop/BoardExample.tsx).
The component gallery also includes the shared
[generic example](../shared/drag-and-drop/DragExample.tsx) for arbitrary targets
and a controlled sortable list. Both examples import public WFE APIs.

Start the standalone preview on an unused port:

```sh
pnpm exec vite --config examples/drag-and-drop/vite.config.ts --host 127.0.0.1 --port 7790 --strictPort
```

Open `http://127.0.0.1:7790/`.
For the generic example, start the component gallery with
`examples/components/vite.config.ts` and open `/?gallery=drag-and-drop`.
Open `/?gallery=kanban` for the board in that gallery.

Build and review the board through source exports:

```sh
pnpm exec vite build --config examples/drag-and-drop/vite.config.ts
node examples/drag-and-drop/run.mjs
```

Build the packages before reviewing their distributed exports:

```sh
pnpm build
BENCH_DISTRIBUTION=1 pnpm exec vite build --config examples/drag-and-drop/vite.config.ts
BENCH_DISTRIBUTION=1 node examples/drag-and-drop/run.mjs
```

The browser runner writes results through the shared artifact runner.
The component gallery runner includes functional cases for generic assignment,
keyboard targets, rejection and sortable move menus.
The shared hydration runner includes a small drag and board fixture for both
source and distributed exports. Test definitions do not imply a completed run.

The examples keep accepted records, item order, rejection and editing in local
application state. They send no network requests. WFE provides dragging,
keyboard navigation, shared presentation and move requests. It does not define
issue statuses, permissions, storage or request handling.

See the [drag and drop guide](../../docs/drag-and-drop.md) for ownership,
accessibility, custom preview restrictions and public import paths.

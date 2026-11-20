# Theme explorer

The explorer shows a compact set of gallery components under one Theme.
It uses the gallery defaults and the shared appearance code. It adds no component styles.

Choose a preset (Sketchy, Vanilla or Laser) and a mode in the header.
The token panel lists every token that the active preset writes, with its computed value.
Edit a value to see the change at once. Use the reset button to restore one token, or Reset all.
Copy changes as CSS copies the edited tokens. Theme writes preset tokens inline today,
so apply copied values through the Theme `style` prop.
Edits stay with their preset when you switch presets.

The [theme audit](../../docs/plan/theme-audit.md) explains the token groups and the cleanup plan.

Run commands from the repository root after installing dependencies.
Start an interactive preview on an unused port:

```sh
pnpm exec vite --config examples/theme-explorer/vite.config.ts --port 7806
```

Run the browser fixture:

```sh
node examples/theme-explorer/run.mjs
```

The runner builds its own fixture and checks token values, live edits, reset, CSS export,
preset switching, overlays, the table, tabs and the phone layout.
Run browser work serially on a shared host.

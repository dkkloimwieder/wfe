# Theme explorer

The explorer shows a compact set of gallery components under one Theme.
It uses the gallery defaults and the shared appearance code. It adds no component styles.

Choose a preset (Sketchy, Vanilla or Laser) and a mode in the header.
The token panel lists every token of the token base in `styles/tokens.css`, with its computed value.
Under each token, the panel names the block that sets it for the current choices:
the base block, or a mode, density, preset or application choice block.
Select "Show only tokens that a block overrides" to see what the active preset and mode change.
Edit a value to see the change at once. Use the reset button to restore one token, or Reset all.
Copy changes as CSS copies the edited tokens as a rule for the active preset.
Theme tokens have zero specificity, so that rule overrides them in an application style sheet.
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

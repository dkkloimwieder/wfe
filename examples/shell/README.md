# Described shell example

This application uses two invented audiences and six routes.
Operations contains Records, Record detail, and Overview.
Research contains Observations, Observation detail, and Findings.
The table and form pages use the existing generator and shared controls.

The application owns address parsing, browser history, accepted navigation, validation, and form values.
The shell supplies the audience selector, route menu, breadcrumbs, heading, and narrow drawer.
The application retains drafts across page changes.
A production application supplies its own navigation and unsaved-work policy.
This example saves no data outside memory.

## Preview

From the repository root, install dependencies with `pnpm install --frozen-lockfile`.
Start the preview on an unused port:

```sh
pnpm exec vite --config examples/shell/vite.config.ts --host 127.0.0.1 --port 7794 --strictPort
```

Open `http://127.0.0.1:7794/`.
Open `http://127.0.0.1:7794/?custom-chrome=1` to try application-supplied header and navigation content.
That example replaces the default heading and audience selector with a header input.
Its menu uses the owning dashboard controls to close the drawer and read its responsive state.

Use the sidebar to open each page.
Use the audience selector to change menus.
The browser Back and Forward buttons restore accepted pages.
On narrow screens, the Navigation button opens the sidebar as a drawer.

The example uses shared blue accents, outline buttons, surface 1 components, surface 2 background, and shadow depth 2.
The table fills the main region. The standalone form fills a shared panel with consistent padding.

## Browser qualification

Build the packages with `pnpm build` before testing built exports.
Build and test the source example:

```sh
pnpm exec vite build --config examples/shell/vite.config.ts
node examples/shell/run.mjs
node examples/shell/run.mjs --hydration
```

Set `BENCH_DISTRIBUTION=1` for each command to test built exports.
Set `BENCH_DEVELOPMENT=1` and `NODE_ENV=development` for each command to test the development runtime.
The hydration runner builds its server and client inputs serially.
The root qualification runner includes these three modes.

The cases cover all six routes, accepted and rejected requests, drafts, native modified links, Back and Forward, breadcrumbs, and heading focus.
They also cover full-height pages, narrow drawers, disposal, initial server focus, and server-node adoption.
A direct hydration address includes unrelated query data and a fragment.
The application synchronizes browser fragments after hydration because HTTP does not send fragments to the server.

Only addresses with `qualification=1` expose the browser fixture API.
The normal preview contains no test controls.
The fixture records requests, page disposal, and history listener cleanup.
Reports remain under `test-results/shell` unless `BENCH_OUTPUT` supplies another path.

# Component gallery

The gallery brings component examples into one browser interface.
It reuses shared components, DashboardShell navigation, AppearanceReview controls, and existing examples.
Gallery code belongs to the examples application. Public component APIs and application responsibilities stay separate.
JavaScript routes load on demand. The components preview bundles its styles together so every route retains the existing CSS integrity tests.

## Open the gallery

From the repository root, start the components preview server:

```sh
pnpm exec vite --config examples/components/vite.config.ts --host 127.0.0.1 --port 7790
```

Open `http://127.0.0.1:7790/?gallery=fields`.
If that server already runs, use its existing URL.

Choose an example from the sidebar. On a narrow screen, use Components to open the navigation pane.
The selected link identifies the current example. Choosing a link closes narrow navigation and focuses the example title.
Escape closes navigation and returns focus to its toggle.
Modified link clicks retain normal browser behavior.

Each example has a direct URL. Browser Back and Forward restore the example and presentation controls.
The Direct link action points to the current URL, including the selected appearance, state, and preview width.
Changing examples starts a fresh example. Changing presentation retains the current example, its DOM nodes, and entered drafts.

## Review controls

Appearance uses the existing surface, accent, depth, and layer controls.
The default is Light, Blue, depth 2, Surface 1 for components, and Surface 2 for the background.
Appearance controls stay collapsed initially so the example receives the available height.
They scroll within their region on small screens.

Example states appear only where the component supports them.
Fields, dates, choices, and boolean controls demonstrate normal, disabled, readonly, and invalid states.
Buttons and tabs demonstrate normal and disabled states.
Readonly buttons and invalid breadcrumbs do not represent useful component states, so the gallery does not offer them.

Full width fills the preview panel. Phone creates a 320-pixel viewport, and Tablet creates a 768-pixel viewport.
When a requested width exceeds the panel, horizontal scrolling stays inside the preview region.
The gallery does not scale the example or silently shrink a requested viewport.

## Examples

The sidebar groups fields, choices, boolean controls, numbers, dates, and files under Forms.
Components includes buttons, contextual controls, dialogs, display states, and a readonly table.
Navigation contains tabs and breadcrumbs. Layout contains Collapsible, Accordion, and resizable panes.
The table fills its main panel, including when only two records exist.

Existing fixture routes such as `?files=1`, `?tabs=1`, and `?consumer=1` remain unchanged.
Gallery previews use `?galleryPreview=<example>` and also work without the gallery shell.
Unknown example IDs fall back to Fields. Invalid presentation values fall back to the approved defaults.

## Preview ownership

Each example runs in a same-origin iframe with a meaningful title.
The frame isolates viewport geometry, landmarks, popup owners, and fixture globals.
This is presentation and lifecycle isolation. It is not a security sandbox.

The preview announces readiness after its owners and message listener exist.
The parent sends its latest presentation state in response.
Both sides accept messages only from the expected window and origin.
The message parser accepts finite presentation values from the catalog.
Files, record values, callbacks, and application actions never cross the message boundary.

Changing examples replaces the frame. Late messages from replaced frames do not affect its replacement.
Disposal removes gallery history and message listeners.
The browser suites cover direct links, modified clicks, history, retained drafts, native viewport dimensions, mobile focus, message guards, and disposal.
They run against source, packaged, and development components.

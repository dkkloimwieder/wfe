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

The top header shows Gallery, the current category, and the current example as breadcrumbs.
An empty footer stays at the bottom.
The left pane contains only the Forms, Components, Navigation, and Layout disclosure sections.
The current category starts open. Route and history changes reveal the selected category.
Expand a category and choose an example from the sidebar. On a narrow screen, use Components to open the navigation pane.
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

The Forms section includes Everything form, fields, choices, boolean controls, numbers, dates, and files.
Everything form combines seven sections with local submission, reset, and field errors.
Its 30rem width becomes 480 pixels with the example root size and shrinks on narrow screens.
Components includes buttons, contextual controls, dialogs, display states, and a readonly table.
Navigation contains tabs and breadcrumbs. Layout contains Collapsible, Accordion, and resizable panes.
The table fills its main panel, including when only two records exist.

Existing fixture routes such as `?files=1`, `?tabs=1`, and `?consumer=1` remain unchanged.
Gallery previews use `?galleryPreview=<example>` and also work without the gallery shell.
Unknown example IDs fall back to Fields. Invalid presentation values fall back to the approved defaults.

## Shared presentation

The gallery and reused standalone examples share `examples/shared/appearance/sizing.ts`.
The examples use Fira Code Variable with its unchanged SIL Open Font License in the shared font directory.
Controls and labels use 12-pixel text. Controls use a 32-pixel height and 10-pixel horizontal padding.
The root size is 16 pixels. Form fields have a configurable maximum width of 30rem.
Light surfaces use white with dark text. Dark panels use #171717 over a #1b1b1b canvas.
Dark inputs use a faint white fill and border. Focus uses a one-pixel neutral ring.
Blue accents and outline buttons retain the selected presentation.
Table dividers retain their separate contrast scale, so matching canvas and panel surfaces do not hide gridlines.
Fields use an 8-pixel label gap. Example sections use a 20-pixel gap, and action rows use an 8-pixel gap.
The same measurements apply in Light and Dark.

The gallery canvas uses tiny neutral dots at 0.3em spacing and 35% opacity.
Solid panels protect labels, descriptions, values, and status messages from the texture.
Form examples use a centered 30rem panel. Tables and resizable layouts retain their full width.
Hover and selection reveal a dotted backing six pixels beyond each action, with a 20% gray outline and no tint.
Each pointer entry chooses a new rotation of 0.5–2 degrees in either direction and a taper between −2 and +2 degrees.
Selected controls retain the latest shape after the pointer leaves.
The backing does not change the click area, intercept input, or replace the keyboard focus ring.
Forced-color mode hides the decoration.

Embedded examples inherit the preview scope instead of resetting its density.
Use `example-stack` for example sections and `example-actions` for action rows.
Select and Combobox own their field layout in the shared component stylesheet.
Explicit density diagnostics and virtual table rows retain their configured geometry.

## Preview ownership

Each example runs in a same-origin iframe with a meaningful title.
The frame isolates viewport geometry, landmarks, popup owners, and fixture globals.
This is presentation and lifecycle isolation. It is not a security sandbox.

The preview announces readiness after its owners and message listener exist.
The parent sends its latest presentation state in response.
The frame stays hidden over the pane surface until it applies that state and loads its fonts.
The parent reveals the frame only after an acknowledgment with the current configuration version.
Both sides accept messages only from the expected window and origin.
The message parser accepts finite presentation values from the catalog.
Files, record values, callbacks, and application actions never cross the message boundary.

Changing examples replaces the frame. Late messages from replaced frames do not affect its replacement.
Disposal removes gallery history and message listeners.
The browser suites cover direct links, modified clicks, history, retained drafts, native viewport dimensions, mobile focus, message guards, and disposal.
They run against source, packaged, and development components.

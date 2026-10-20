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
The left pane contains Forms, Components, Navigation, and Layout sections, with a small outlined triangle on the divider.
The current category starts open. Route and history changes reveal the selected category.
Expand a category and choose an example from the sidebar. On a narrow screen, use Components to open the navigation pane.
The selected link identifies the current example. Choosing a link closes narrow navigation and focuses the example title.
Escape closes navigation and returns focus to its toggle.
Modified link clicks retain normal browser behavior.

Click the divider triangle to collapse or expand the desktop sidebar.
Hover fills the triangle with the accent color without changing the sidebar.
Appearance offers two icon behaviors: Open beside icons and Expand sidebar.
The first opens an adjacent submenu. The second expands the sidebar and the selected group.
Small screens keep labeled sections in the navigation drawer.
Changing sidebar presentation preserves the current example and its draft.

Each example has a direct URL. Browser Back and Forward restore the example and presentation controls.
The Direct link action points to the current URL, including the selected appearance, state, and preview width.
Changing examples starts a fresh example. Changing presentation retains the current example, its DOM nodes, and entered drafts.

## Review controls

Appearance uses the existing surface, accent, and layer controls.
The default is Light, Blue, no shadows, Surface 1 for components, and Surface 2 for the background.
Appearance controls stay collapsed initially so the example receives the available height.
They scroll within their region on small screens.
The secondary accent has its own color choice.
Dots and decorative borders can use neutral, primary, or secondary colors.
Separate sliders control dot opacity, decorative border opacity, and dots inside buttons.
Slider changes update the preview immediately and create one history entry when the adjustment ends.

Example states appear only where the component supports them.
Fields, dates, choices, and boolean controls demonstrate normal, disabled, readonly, and invalid states.
Buttons and tabs demonstrate normal and disabled states.
Readonly buttons and invalid breadcrumbs do not represent useful component states, so the gallery does not offer them.

Full width fills the preview panel. The other controls limit content width to 320 or 768 pixels.
Each limit fits within the available panel width. The gallery does not scale the example.
These controls test content layout. Resize the browser to test viewport media queries.

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

The gallery and reused standalone examples share `themeSizing` from `@wfe/components/theme`.
The examples use Fira Code Variable with its unchanged SIL Open Font License in the shared font directory.
Controls and labels use 12-pixel text. Controls use a 32-pixel height and 10-pixel horizontal padding.
The root size is 16 pixels. Form fields have a configurable maximum width of 30rem.
Light surfaces use white with dark text. Dark panels use #171717 over a #1b1b1b canvas.
Dark inputs use a faint white fill and muted gray borders. Focus uses a one-pixel neutral ring.
Blue accents and outline buttons retain the selected presentation.
Table dividers retain their separate contrast scale, so matching canvas and panel surfaces do not hide gridlines.
Fields use an 8-pixel label gap. Example sections use a 20-pixel gap, and action rows use an 8-pixel gap.
The same measurements apply in Light and Dark.

The gallery canvas uses tiny neutral dots at 0.3em spacing and 50% opacity.
Solid panels protect labels, descriptions, values, and status messages from the texture.
Form examples use a centered 30rem panel. Tables and resizable layouts retain their full width.
Hover and selection reveal a dotted backing six pixels beyond each action, with a neutral or accent outline and no tint.
Each pointer entry chooses a new rotation of 0.25–2.25 degrees in either direction.
Horizontal and vertical tapers vary independently between −1.75 and +1.75 degrees.
Selected controls retain the latest shape after the pointer leaves.
The backing does not change the click area, intercept input, or replace the keyboard focus ring.
Forced-color mode hides the decoration.

Embedded examples inherit the preview scope instead of resetting its density.
Use `example-stack` for example sections and `example-actions` for action rows.
Select and Combobox own their field layout in the shared component stylesheet.
Explicit density diagnostics and virtual table rows retain their configured geometry.

## Preview ownership

Each example renders directly in the gallery document. The gallery contains no iframes.
One default Theme wraps the gallery and its examples.
Appearance controls update that shared theme. State controls pass reactive props to the current example.
Gallery CSS arranges the page and does not override button or input styling.
Changes to those props preserve the example and its draft values.
Changing examples disposes the previous component and mounts the next one.
Disposal also removes the gallery history listener.

The width controls change the available content width, not the browser viewport.
Resize the browser to test viewport media queries and mobile navigation.
Standalone preview URLs remain available for focused browser tests.
Table title decorations can extend into the existing toolbar area without extra spacing.
The browser suites cover direct links, history, retained drafts, state changes, mobile focus, and cleanup.

Generated examples pass the shared sizing profile through `LayoutView.style`.
Form controls use 32px height, 12px text, 8px control gaps, and 20px field gaps.
Single-column forms center within a 30rem limit.
Declared multi-column grids retain their responsive layout.
Individual fields retain the 30rem maximum.
Table-cell controls use an explicit 26px compact profile to preserve 32px rows.

# wfe: application shell, grid, tiles, labels

**Status:** draft for owner review.
**Baseline:** `main` at `e4ff5bb`.

## 1. Goal

Four additions to the public packages so an application can build an administrative UI from descriptions alone: a shell layout, a boolean grid, status tiles, and labels with formats. Each is generic. Each ships with an example under `examples/` and its own tests under wfe's existing rules.

## 2. Rules

- No application-specific type, name, route or rule enters a package. The examples use invented data.
- Public exports only. An example imports what an application would import.
- The existing form contract, generator contract, layout guide and adoption guide are updated in the same change that adds to them.
- One epic at a time. Each epic ≤3 issues.

## 3. Epics

| #   | Epic                                                                                                                                                                                                                                                                                           | Done when                                                                                          |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| W1  | `@wfe/shell`: a layout package. Audience switcher, sidebar built from a route table, breadcrumbs, page title, focus moves to the heading on navigation, drawer on narrow screens. It owns no session, no transport, no authorization, no address parsing beyond what the route table gives it. | An example with two audiences and six routes renders, navigates, and passes the hydration case.    |
| W2  | `@wfe/generator`: `GridDescription`. Rows and columns by key; each cell a boolean; one callback per cell change; read-only columns; disabled rows; row and column labels.                                                                                                                      | The example renders a 30 × 5 grid from a description and reports each change through the callback. |
| W3  | `@wfe/components`: `StatusTile` (label, value, one-line detail, state: ok / warning / unknown) and `TileRow`.                                                                                                                                                                                  | Example and visual case.                                                                           |
| W4  | Descriptions accept optional `label` on each field and operation, and `format` on each field: `date`, `boolean-symbol`, `short-hash`. `TableView` and `FormView` honor both.                                                                                                                   | Generator contract doc updated; example shows each format.                                         |
| W5  | Tag a release with W1–W4. `docs/adoption.md` names the tag and the four additions.                                                                                                                                                                                                             | Tag exists.                                                                                        |

W1–W4 are independent. W5 follows all four.

## 4. Out of scope

- Session, sign-in, transport, authorization. An application owns them.
- Routing. The shell takes a route table and a current route; the application decides what a route is.
- Any new vendor source.

# Agent-composable building blocks

This plan proposes how AI agents assemble application screens from wfe building blocks.
It follows the approach of Vercel Labs UI SDK (`vercel-labs/ui`, `0.1.0-beta.13`, Apache-2.0).
Beads issue `wfe-w2y.70` tracks the design. The owner decisions at the end come before implementation.

## Goal

WAMN needs complex screens, such as a workflow editor with a list, a graph and an inspector.
Fully generated screens do not cover these screens.
Agents must compose tested building blocks, and each block needs an exact, machine-readable contract.

The library stays generic. WAMN is a consumer, and no WAMN rule enters the components.

## Current state

| Area                      | wfe today                                                                                    | UI SDK                                                                                          |
| ------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Part model                | Three models: compound `Root.Part` (16 families), props only, and render props in data views | One model: `definePrimitive` with named slots, roles and state                                  |
| State attributes          | Per component (`data-tree-id`, `data-diagram-node`, Kobalte attributes)                      | `data-slot="<component>-<part>"` and boolean state attributes                                   |
| Change callbacks          | Standard for 5 families. Others differ, for example Slider requires an event argument        | `on<Key>Change(value, details)` with `reason`, `source` and `cancel()`                          |
| Machine-readable metadata | Types, contract tests and the gallery catalog                                                | Generated Markdown, `llms.txt`, a skill and a runtime schema. No static JSON manifest for Solid |
| Screen descriptions       | TypeScript literals for 8 view kinds. No serialized format                                   | None. UI SDK has no screen layer                                                                |
| Agent runtime             | None                                                                                         | `createAgent` with `snapshot`, `query` and `act`, and WebMCP registration                       |
| Data views                | Table, Chart, Diagram, Gantt, Kanban, Tree                                                   | None                                                                                            |

The research notes are in the `wfe-w2y.70` Beads notes.

## Two assembly paths

The design supports two ways for an agent to build a screen. Both paths use the same manifest and contract.

1. Composed source. The agent writes Solid TSX that imports wfe components. This path is for complex screens.
2. Described screens. The agent writes a JSON screen description, and `@wfe/generator` renders it. This path is for standard screens and for screens that WAMN stores as data.

A described screen can contain a composed view through a named custom view. Thus a screen can start as a description and grow into code one panel at a time.

## Layer 1: manifest, agent docs and skill

The build generates a component manifest for each package. Each component entry contains these facts:

- the import path and the component kind
- the parts, their nesting and the required parts
- the props, with kind, type, default value and controlled pairs
- the state attributes and CSS variables of each part
- the change callbacks and their reasons
- the accessibility requirements, for example a required `label` on Tree, Diagram and ColorPicker
- composition rules and preferred alternatives, for example `SelectField` before `NativeSelect`
- links to examples and the tested behaviors, taken from test titles

The sources are the TypeScript types, a small metadata declaration next to each owned wrapper, and the test titles.
A test makes sure that each public export has an entry and that each declared data attribute appears in the rendered DOM.

The build also generates Markdown for agents:

- `llms.txt` with one line per component and its import path
- one page per component with its composition tree, props, state attributes and an example
- a skill folder with `SKILL.md`, a table that maps user intents to components, and recipes

The first recipes are master-detail, a form bound to a selection, and an editor with an inspector.
The examples in the docs contain no test scaffolding.

## Layer 2: uniform part and state contract

All changes in this layer are additive. No export is removed or renamed.

- Every part gets `data-slot="<component>-<part>"`. The `ui-*` classes and `data-ui` scope stay.
- State attributes use one vocabulary: `data-open`, `data-closed`, `data-checked`, `data-unchecked`, `data-disabled`, `data-readonly`, `data-invalid`, `data-selected`, `data-highlighted` and `data-pending`.
- Every change callback receives a `details` object as its last argument. It contains `reason`, `source`, `event` and `cancel()`. The `source` value `agent` marks a change that an agent made.
- Controlled state uses `<key>`, `default<Key>` and `on<Key>Change` on every control. The existing aliases stay.
- Props-only components get named parts only where a recipe needs them, for example the Slider thumb.
- Each wrapper registers its instance with an optional registry context. Without a registry, the cost is zero.

Owned components implement this contract directly. Kobalte-backed components implement it in the owned wrappers, so the vendor tree and its provenance do not change.

## Layer 3: described screens version 2

A screen description becomes plain JSON. It contains no functions and no JSX, and it refers to bindings by name.

- The build generates a JSON Schema from the description types and adds it to the manifest.
- `validateScreen(json)` returns errors with paths before rendering. Today, errors appear only when the view mounts.
- New view kinds: tabs, split panes, tree, diagram, kanban, gantt, dialog, sheet, toolbar, status tiles and empty state.
- Tables come from the description. Columns refer to record fields by key, and the application supplies the source binding. Today, the application must call `createTable` in code first.

A screen declares named channels for its shared state. A channel holds identity, such as a selected ID, and never a record.
Views read and write channels. For example, a table writes the selected workflow ID, and a diagram reads it.
The application resolves IDs to records through its bindings, so records, permissions and requests stay in the application.

Actions can name a target channel. The action binding then receives the channel values as a context argument. `run: () => void` stays valid.

## Layer 4: runtime agent bridge

A later package, `@wfe/agent`, gives an agent a live view of a running screen.
It provides `snapshot`, `query` and `act` over the registered instances, and it can register these tools through WebMCP.
DOM marks control what an agent can do alone: confirm, secret and hidden regions.
The bridge sits at the application boundary. Components only register their instances.

## Behavior layer: Kobalte or UI SDK

wfe vendors a Kobalte subset (215 modules, 12 entry points) with local repairs. UI SDK has a tested Solid 2 adapter for the same Solid versions that wfe pins.

|              | Keep vendored Kobalte         | Move to UI SDK one family at a time                                                                     |
| ------------ | ----------------------------- | ------------------------------------------------------------------------------------------------------- |
| Contract     | Layer 2 lives in the wrappers | The contract comes from the primitives                                                                  |
| Agent bridge | wfe writes its own registry   | `createAgent` works for UI SDK primitives. Owned data views still need the wfe registry                 |
| Tests        | Current wfe suites            | Adds virtual screen reader, axe, RTL and SSR suites per primitive                                       |
| Catalog      | Current controls              | Adds OTP input, image cropper, token input, timeline, toolbar and others                                |
| Risk         | Local repairs continue        | Beta API, Solid bundles about twice the React size, known Solid issues, peer floor rises to Solid 2.0.0 |

The recommendation is a pilot without commitment.
Replace Switch and Dialog behind the existing wfe API, then compare bundle size, SSR, hydration, focus behavior and test results.
If the pilot passes, move other families one at a time, so the library keeps one implementation of each control.
Table, Chart, Diagram, Gantt, Kanban and the other data views stay owned in every case.

## Test additions

- Virtual screen reader transcripts for compound controls, with `@guidepup/virtual-screen-reader`
- Focus recovery when a focused part leaves the page
- An agent test: a reference screen that loads from JSON, passes `validateScreen`, renders, and survives hydration

## Work order

1. Manifest, agent docs and skill (Layer 1). The UI SDK pilot runs at the same time.
2. Uniform contract (Layer 2), starting with the controls that the recipes use.
3. Described screens version 2 (Layer 3), with the workflow editor as the reference screen.
4. Runtime agent bridge (Layer 4).

The workflow editor also needs Diagram editing: node move, connect, delete and create callbacks. That is a separate feature issue.

## Owner decisions

1. Assembly paths: support both paths, with composed source first. Or choose one path.
2. Behavior layer: run the UI SDK pilot for Switch and Dialog, or keep Kobalte.
3. Schema validation: add `zod/mini` (already in the lockfile at 4.6.7 for examples) to `@wfe/generator`, or write an owned validator that uses the generated JSON Schema.
4. Change details: add `details` as the last callback argument (additive), or change the signatures (breaking).
5. Reference screen: accept the workflow editor (list, diagram and inspector) as the acceptance target.

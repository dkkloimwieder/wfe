# Drag-and-drop engine

WFE uses one owned drag-and-drop foundation for arbitrary drop targets,
sortable lists, table columns, and Kanban. Applications own records, accepted
order, permissions, requests, persistence, conflicts, and undo.

## Decision

Capture the evaluated framework-independent dnd-kit entry points and retain their
internal state model. Build a Solid 2 adapter with WFE types and lifecycle
ownership. Do not import the upstream Solid 1 adapter or expose engine types
through the public API.

The selected upstream revision is
`2fcef8180f68a0cff6d629089ed014ea2131cbe6`. Its package manifests identify
version 0.5.1. The capture contains the DOM core and upstream sortable entry
points, plus every source file that they import. These files span the DOM,
abstract, geometry, collision, state, and helper packages.

The active WFE sorter uses the generic engine. Applications own accepted
ordering. WFE calculates destinations and supplies keyboard navigation.
Upstream Sortable, its plugins, and their helpers remain captured for
reproducible comparison. They are not the active sorting implementation.
The helpers enter this captured reference through OptimisticSortingPlugin.
The capture is therefore larger than the source required by the active adapter.
Consumer builds can remove unused exports through tree shaking.

The capture preserves the MIT license, original hashes, local hashes, and
repair descriptions. The engine uses external `@preact/signals-core` at
1.10.0. This is its internal state dependency, not the Preact UI framework.
Solid and Solid Primitives remain external. Existing package pins stay unchanged.

An isolated minified build measured 102,873 bytes, or 27,617 gzip bytes, for
the basic engine. Adding upstream Sortable measured 116,162 bytes, or 31,159 gzip bytes.
These figures include decorator lowering and the engine state dependency. They are probe results,
not a size guarantee for the final WFE adapter.

## Alternatives

The inspected solid-dnd revision is
`809014fa9ea058ab3cf54ad9d855970b7fd866ab`, version 0.7.5, under MIT.
Its 1,877 source lines need substantial Solid 2 changes. Keyboard operation,
cancellation, automatic scrolling, and complete pointer cleanup also need
new implementation. Its small source size does not represent the cost of
the required behavior.

The inspected Pragmatic drag-and-drop revision is
`80f1a86d08060f9946125d1dd7c1eaf5c89b605b`, with core version 4.0.0,
under Apache-2.0. Its native browser dragging and shared lifecycle require
different activation and scope behavior. Keyboard movement remains separate.
WFE selects one pointer and keyboard engine instead of combining native
browser dragging with another pointer implementation.

Zaidan provides a useful Kanban composition reference. Its board uses dnd-kit.
WFE retains its own controlled contracts, components, and styles.

## Integration boundaries

Create engine managers and registrations after mount. Dispose observers,
listeners, subscriptions, registrations, and managers with their owners.
Bridge only the engine state that WFE renders into Solid signals.
Do not mirror application records into another store.

Exclude the default Feedback and Accessibility plugins. Their clone and
attribute behavior does not meet WFE ownership requirements. WFE supplies
safe presentation, announcements, and restored attributes. Keep the engine
pointer, keyboard, geometry, and scrolling behavior.

Exclude OptimisticSortingPlugin because it moves DOM nodes and changes
indices during hover. Temporary previews never change caller arrays.
A completed drop emits one move request. Caller state determines the
accepted order. Cancellation emits no move request.

The public scope rejects duplicate registrations. Source and target IDs
have separate namespaces. Independent scopes cannot receive each other's
items. Changed or removed identities invalidate an active gesture.
Menu actions use the same acceptance and final-request contract as dragging.

Table column movement retains its existing immediate keyboard commands and
move menu. Resizing, cell selection, and external file uploads remain distinct
interactions. The common reorder foundation does not replace those behaviors.

## Evidence and release

Initial inventories, strict compiler output, and build probes remain under
`/tmp/wfe-dnd-probe` and `/tmp/wfe-dnd-audit`. The vendor manifest records
the reproducible source identity. Runtime, SSR, hydration, cleanup, and
functional browser evidence must pass before the engine-selection issue closes.

Tests cover functionality, accessibility, focus, and cleanup. Visual review
covers appearance. Routine work uses focused checks. Full qualification follows
completion of both drag-and-drop and Kanban epics.

## References

[dnd-kit source](https://github.com/clauderic/dnd-kit)
provides the captured engine and license.
[solid-dnd source](https://github.com/thisbeyond/solid-dnd)
provides the alternative implementation inspected during selection.
[Pragmatic drag and drop](https://github.com/atlassian/pragmatic-drag-and-drop)
provides the native-browser alternative.
[Zaidan Kanban](https://zaidan.carere.dev/docs/blocks/kobalte/kanban)
provides a composition reference.

## Focused implementation evidence

The capture replay reproduced all 197 recorded files after the retained
lifecycle repairs. The build pipeline lowers standard decorators only inside
the captured dnd-kit TypeScript tree. Unrelated Solid JSX retains its normal
compiler. Source distribution emission already uses the same ES2022 target.

Focused tooling checks exercised decorator accessor initialization and updates,
source-boundary exclusion, dependency pin enforcement, repair hash failures,
and notice copying. Four presentation tests passed for lifecycle announcements,
portal cleanup, default label-only previews, stable custom preview rendering,
and accessible non-submit handles. Broader browser, hydration and built-package
checks remain separate requirements. This record does not mark them complete.

# dnd-kit source capture

This is the framework-independent dnd-kit engine at commit
`2fcef8180f68a0cff6d629089ed014ea2131cbe6` (package version 0.5.1), under MIT.
The capture contains the 196 TypeScript files reachable from the DOM core and
sortable entry points. It includes the abstract, collision, geometry, state and
helpers source needed by those entry points. It does not include framework
adapters or upstream examples and tests.

WFE's active sorter uses the generic DOM engine. Applications own accepted
ordering. WFE calculates destinations and provides keyboard navigation.
The upstream Sortable entry, its plugins, and their helpers remain captured
for reproducible comparison. WFE does not instantiate them for sorting.
This capture includes that reference code, not only the active adapter's
imports. Consumer builds can remove unused exports through tree shaking.

The only external runtime dependency is `@preact/signals-core`, pinned to
`1.10.0`. Its signals are private engine state. The WFE adapter owns the Solid
lifecycle and public reactive interface; consumers do not need Preact APIs.

The source uses standard decorators and auto-accessors. The build must lower
these before execution. TypeScript's standard decorator transform with target
ES2022 works; setting a Rolldown target alone does not lower decorators.
Do not enable legacy `experimentalDecorators` for this source.

## Capture and repairs

`provenance.json` records every original and local SHA-256 hash, the exact
revision, entry points, external imports and the repair patch hash. Internal
package imports are rewritten to relative captured paths. Source formatting
stays upstream's. `repairs.patch` applies after import rewriting.

To reproduce the capture from an exact upstream checkout, use an empty output
directory:

```sh
node scripts/capture-dnd-kit.mjs /path/to/dnd-kit /tmp/dnd-kit-capture
```

The script checks original hashes, rewrites imports, applies the recorded patch
and checks local hashes. It never downloads source or changes the checkout.

Local repairs retain upstream behavior except where malformed or changing DOM
input previously caused a crash:

- Explicit `return undefined` at optional cleanup/value fallthroughs satisfies
  `noImplicitReturns` without changing returned values.
- Remove unused imports; retain an unused generic parameter under an underscore
  name; use browser-compatible timer types and a declaration for the bundler's
  development-mode expression.
- Guard missing cloned fields, placeholder cells and observer entries. A DOM
  mismatch skips the missing field/cell; an empty observer batch does nothing.
- Assert the final keyframe only after checking its array length. Grouped move
  keys are asserted only after `Object.entries` or own-property lookup proves
  their membership. Optimistic sorting guards both returned groups.
- CSS parsing uses empty-string defaults or `Number` conversion, preserving
  the upstream NaN handling for absent components.
- Reference-count the non-passive window touch listener across all pointer
  bindings. The first binding installs it; the last removes it. Each release
  is idempotent. This retains the upstream touch-scroll workaround without
  leaving a permanent window listener after teardown.

Focused repair coverage lives in `tests/unit/dnd-vendor.test.ts`. The engine is
an implementation detail, not a separate WFE public API. Do not import its
classes from application code.

Terminal action cleanup runs even if a consumer's `dragend` callback throws.
Queued moves check their captured controller and active state before applying.
Deferred terminal cleanup also checks controller identity so it cannot reset a
later operation. These lifecycle repairs have focused cancellation and exception
tests in the same vendor test file.

Pointer bindings now retain the initiating pointer ID, ignore unrelated pointer
moves/releases and ignore Escape during text composition. Window blur, hidden
documents and lost pointer capture cancel the active interaction. Aborting the
engine operation also releases the sensor's transient listeners and pointer
capture immediately. Activation ownership is assigned before synchronous
activation so an immediately rejected drag cannot leave pending listeners.

Both pointer and keyboard sensors expose an internal `cancel()` method for the
WFE adapter. Binding teardown and disabled sources cancel only the interaction
owned by that source, including pending pointer activation. Keyboard listeners
also follow engine aborts and ignore composition keystrokes. Pointer release
flushes the final pending coordinates before resolving a drop, without waiting
for another animation frame.

Scrolling work has bounded ownership: listener cleanup clears its delayed
collision timer; queued scroll work checks the captured operation controller and
disposal state; auto-scroll disposal invalidates queued interval callbacks; and
the scroll intent subscription is disposed with its owning scroller. Tests drive
these queued tasks directly or with fake timers, without wall-clock waits.

Auto-scroll interval cleanup does not write the reactive `autoScrolling` flag:
scrollable-ancestor discovery reads that flag, so changing it during each effect
cleanup creates a false/true reactive cycle. Inactive branches reset it, and
explicit disposal resets it only after the effect is disposed. A focused
regression covers this dependency, and the narrow-board browser case exercises
actual horizontal edge scrolling.

Reusable activation constraints release their completed controller through a
one-shot abort listener before resetting their local state. Aborted controllers
ignore later activation calls and events. Pointer cleanup also clears the
signal's `onabort` handler, which otherwise retains the initiating event after a
reusable constraint has finished. The browser listener audit checks the same
steady-state listener count before and after a completed drag.

The pointer capture-loss listener handles only events whose target is the body
that owns the engine's explicit capture. A touch source's implicit capture-loss
event can bubble through that body during transfer; it must not cancel the drag.
Loss of the owned capture still cancels, subject to the initiating pointer ID.

Scrollable ancestor discovery stops at fixed elements, but traverses sticky
elements. A sticky table header remains inside its horizontal scroll container;
treating it as fixed hid that container from edge scrolling. The only production
caller of the internal `isFixed` helper is this ancestor traversal. Regression
coverage includes nested sticky ancestors, preserved fixed boundaries and actual
queued horizontal scrolling.

Pointer release uses the matching pointerup event's coordinates, converted through
the same frame transform as pointermove, before flushing the final move. This also
covers a release with no intermediate pointermove. Final geometry therefore does
not depend on the browser having delivered a move event at the release position.

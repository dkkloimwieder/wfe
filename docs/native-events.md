# Native event listener ownership

`@wfe/components/events` continues to export `nativeEvents`. Create its ref
inside a Solid owner, then attach the returned ref to one element. The ref can
run without an active owner. Registration waits for settlement, and disposal
removes the listeners even if the element has already left the document.
Disposal before settlement attaches nothing.

The helper captures the handler map's entries at settlement. Replacing a map
entry after attachment does not replace that native listener. Use a stable
handler that reads current application state when that behavior is needed.
Native event names remain lowercase, such as `click` and `submit`.

Styled components use a separate internal adapter for JSX event props. It
tracks the available prop names, then reads each current handler when the event
fires. Reactive spreads can add or remove event names without replacing the
control. An existing prop can change between a function, a bound handler tuple,
and `undefined`. Ordinary object mutations do not trigger reactive updates. Native JSX callbacks retain their existing
names, argument shapes, tuple payloads, and default-prevention behavior.

Both adapters share only registration, ref capture, and removal. They pass the
original native event through, including synthetic or trusted status and an
already prevented event. They do not add routing, acceptance rules, or an
additional event dispatch system. Consumer refs and component callbacks keep
their existing contracts.

No public import or handler migration is required. JSX event props are not
blanket-replaced, and the native listener repair remains in place. The
[action disposal investigation](action-disposal-investigation.md) concerns a
separate disposal repair; this extraction does not retire either repair.

## RC18 retention result

On October 25, 2026, the preserved runtime-only event fixture ran against installed Solid RC18.
The module inventory identifies RC18 for Solid, Signals, and Web.
Six cases used 1,000 records each and captured twelve actual heaps with Chromium 153.0.8010.12.
Delegated trusted and synthetic input retained all 1,000 records after disposal.
The no-event, native-listener, native-unowned, and explicit delegated-handler-clear controls retained zero records.
The fixture bytes match the historical reproduction.
The diagnostic runner observes retention without requiring the old failure, and the heap inspector selects the exact record group.

Keep the owned native listeners.
This result does not establish a safe upstream replacement.
Evidence is `/tmp/wfe-event-rc18-20261025/evidence.json`, with primary and control reports and heaps beside it.
Beads `wfe-0dj.5` tracks a future matched replacement.

## RC21 retention result

The November 4, 2026 comparison uses the unchanged historical fixture against exact RC18 and RC21 packages.
Both runs use the same runner, inspector, and Chromium 153.0.8010.12 executable.
Each version covers six cases with 1,000 loaded records and captures twelve actual heaps.
RC18 retains 1,000 records after delegated trusted and synthetic input.
RC21 retains zero records in all six cases.
The four controls retain zero records on both versions, with correct event delivery and cleanup counts.

This standalone result makes RC21 a candidate for a separate retirement review.
The upgrade retains the owned listeners until public browser behavior and actual component heaps qualify removal.
Beads `wfe-0dj.5` remains open for that work.
Reports and compressed heaps reside under `test-results/solid-rc21/events-rc18` and `test-results/solid-rc21/events-rc21`.
`test-results/solid-rc21/event-fixture/provenance.json` records the historical source hashes and diagnostic runner changes.
The runner observes delegated retention without requiring the historical leak, and the inspector selects the exact record group.

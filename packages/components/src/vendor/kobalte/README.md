# Owned Kobalte subset

This directory contains 215 source modules for the owned controls and their shared Kobalte Core and Utils dependencies.
The origin is revision `ba6b1df04eeeb3e6cce050e9fce7004e1237bae8` from the Kobalte `solid2` branch, dated October 29, 2026 (`@kobalte/core` 2.0.0-alpha.4).
`provenance.json` records the original and local SHA-256 for each source and license.
The copied originals match archive SHA-256 `a8622922ae889a70f8a65d7ec441be805218908bd0cd563fed1250b9794e0947`.
The root, Core, and Utils licenses remain unchanged.
Original third-party attribution comments remain in their source files.
This subset retains module barrels and their type dependencies. It does not claim a minimal browser bundle.

## Local changes

`core/src/primitives/index.ts` uses named re-exports so the built barrel has no runtime namespace re-export and consumers tree-shake @solid-primitives/controlled-signal.
It re-exports only `createControllableSignal` and the type `CreateControllableSignalProps` from that package.

Core imports the single checked-in Utils subset through relative paths.
Repository formatting replaces upstream formatting.
Focus handlers use `untrack` when synchronous DOM events read current state.
Combobox initial snapshots and imperative effect callbacks also use explicit untracked reads.
Effect computation functions retain their tracked dependencies.
Selectable collections scroll their own viewport instead of the document.
Menu focus traps preserve focus already established inside the menu before delayed initial focus runs.
This prevents an earlier empty focusable snapshot from moving focus off the first item.
Caller initial-focus callbacks still run before the preservation guard.
The deferred menu-opening task also preserves focus when the intended item already has it.
The provenance records the prior local hash for this repair.
When a dropdown closes, it restores focus to its trigger if focus stays in the menu or returns to the document.
The deferred handler leaves focus on the next control after Escape.
If the menu reopens before the handler runs, the handler leaves focus alone.
Menus use direct presence because their transition duration is zero.
This avoids the animation helper's forced body measurement and preserves `forceMount` for caller-owned transitions.
Popper keeps anchor layout observation by default and exposes `observeAnchorLayout` for fixed viewport-point anchors.
Native polymorphic elements and dismissable layers use owned DOM listeners from `src/ownedEvents.ts`.
Custom component rendering through `as` retains the upstream forwarding branch.
Select and Combobox reference arrays avoid outer TypeScript assertions that the current compiler drops.
Reference casts remain inside those arrays where generic element types require them.

The strict type pass makes implicit undefined returns explicit in the keyboard delegate.
It preserves known nonempty array accesses and guards missing collection keys and touch entries.
Dependency iteration avoids unchecked array access.
Combobox now returns its plural option-count announcement instead of discarding that string.
Combobox active-descendant and list page-navigation lookups also compare exact `data-key` values.
Quoted and backslash keys remain valid identities without CSS escaping or selector interpretation.
A focused source test covers zero, one, and multiple results.

Combobox accepts `inputValue` for application-controlled search text.
It keeps that text separate from selection, blur, and Escape.
The input restores the accepted text when the application rejects an input change.
Its keyboard handler respects a caller that prevents the default action.
Styled controls use this behavior to give footer buttons keyboard access.
Select does not prune application-controlled values when the current option page changes.
Both controls resolve missing selected options from the supplied controlled value.
The hidden select retains missing selected keys for native form submission.
It reapplies native selection after the browser processes replacement option nodes.
Select exposes `aria-invalid` on its trigger when its validation state is invalid.
These repairs do not fetch options or store a separate record cache.
The event dispatch helper now lives in generic Core source outside this subset.
Utils re-exports that helper, so native controls reuse it without importing Kobalte modules.

Boolean controls keep native checkbox and radio inputs for keyboard behavior and form values.
Their visual controls respect caller events that prevent the default action.
Disabled radio items reject pointer selection. Read-only radio groups restore every native checked state after a rejected change.
Reset callbacks run after the native reset action and restore accepted controlled values or uncontrolled defaults.
A shared Core helper cancels pending reset work on disposal and respects prevented reset events.
The shared form label reads its one-time forwarded ref through `untrack`.
Combobox Control snapshots its forwarded ref before the lazy view.
This keeps ID and class spreads from rebuilding the control and its children.
Checkbox, Switch, shared form parts, and radio items snapshot generated default IDs through `untrack` during setup.
These defaults stay stable when a caller changes a property spread or a parent ID.
Caller-supplied IDs remain reactive and retain their registration effects.
Checkbox, Switch, and RadioGroup roots also snapshot their forwarded refs.
Inputs use the same ref snapshots.
Indicators read the current ref without tracking when their elements mount.
This prevents spread updates from recreating indicator elements or producing untracked-read warnings.

Dialog and AlertDialog now share the owned dismissable layer and external focus, interaction, and scroll primitives.
Dismissable layers forward native and custom `as` elements through the repaired Polymorphic component.
They register while enabled and release their layer and document locks while disabled.
Force-mounted closed dialogs keep their content without locking scrolling or receiving dismissal events.
Dialog trigger and close handlers respect prevented caller events.
Caller focus restoration takes precedence over the default trigger focus.
Dialogs without a connected trigger retain the focus primitive's previous focus target.
Modal content exposes `aria-modal`. AlertDialog prevents outside dismissal.
The dismissable layer sends a cancelable `ui:interact-outside` event from the layer so a containing view can keep a popup open.
Background hiding waits until focus enters the mounted modal.
The shared Core helper follows the external focus trap or caller focus callback and releases its listener on closure.
This order prevents `aria-hidden` from hiding a focused opener before delayed initial focus runs.

The external scroll registry uses the existing owner repair through a pnpm patch.
Solid, Solid Primitives, Floating UI, and internationalized number formatting remain external.
No installed Kobalte module supplies the library implementation.
Beads `table-gd3.6.7.9` retains the earlier repair evidence and upstream retirement scope.

## Revision ba6b1df update

Beads `wfe-0dj.13` moved the origin from `e9d426d438b7c9ea0cc81bd1133831a20cd5fcae` (September 24, 2026) to `ba6b1df04eeeb3e6cce050e9fce7004e1237bae8`.
The ten upstream commits include the new Solid compiler fixes (#740), strict untracked reads (#741), and hydration symmetry (#746).
Upstream changed 18 of the 218 captured files. The other 200 originals, the three licenses, and the entry points are unchanged.
The new tree was built from the new originals with the same formatting and Utils import stages, and each residual repair was then re-applied.
The replay tool reproduces it exactly. The residual patch still touches the same 130 files.

Upstream now covers these local repairs. The files keep their local text, and the residual patch shrinks or keeps only the wider local wrappers:

- `combobox/combobox-base.tsx`: untracked option and visibility reads and the initial announcement snapshot. The local reset helper still wraps its whole body in `untrack` and also resolves controlled values.
- `select/select-trigger.tsx` and `selection/create-selectable-collection.ts`: untracked focus-handler reads. The local handlers keep their wider `untrack` wrappers.
- `selection/create-selectable-item.ts`: the untracked reference read in the focus handler.
- `select/hidden-select-base.tsx`: upstream wraps option reads in memos because the `For` child runs untracked. The local option list already reads those values inside JSX bindings, so its native-selection repairs stay unchanged.
- `tabs/tabs-root.tsx`: the untracked initial selection write.
- `form-control/form-control-label.tsx`: the untracked forwarded reference.

These upstream changes were added to the local source:

- `checkbox/checkbox-input.tsx` and `radio-group/radio-group-item-input.tsx`: untracked reads in the native change handlers.
- `radio-group/radio-group-root.tsx`: untracked reads while native inputs synchronize.
- `popover/popover-root.tsx`: `generateId` reads the root ID without tracking.
- `popover/popover-trigger.tsx`: the forwarded reference is read once without tracking.
- `menu/menu-sub-content.tsx`: the outside-focus check reads the trigger without tracking.
- `selection/create-selectable-item.ts`: the focus effect moves focus inside `untrack`.
- `dismissable-layer/dismissable-layer.tsx`: the whole Escape handler now runs inside `untrack`. The local enabled check moved inside that wrapper. The outside-interaction handlers already used local wrappers.

These are strict-read diagnostic fixes. They do not change rendered markup or event results.

The form-control hydration change (#746) conflicts with the local server registration, so the local form-control files stay as they were:

- Upstream renders server associations from the default part IDs, such as `${id}-label` and `${id}-description`. Those IDs are used even when the part does not render or the caller supplies a custom ID. The local server context records only the IDs that the rendered parts register.
- Upstream registers parts on the client during rendering. The local parts register in effects, and `internal/fieldRendering.tsx` renders the field after its siblings register.
- Upstream adds `role="alert"` to error messages. The local message stays without an implicit live region. This matches `FieldError` and the generator's rule that applications choose announcements. Callers can still pass `role="alert"`.

Open upstream pull requests against `solid2` were reviewed on November 19, 2026. None is merged, and none is applied here:

- #770 would scroll only the collection container. It would replace the local viewport-only scrolling in `selection/create-selectable-collection.ts` and the related Utils change.
- #780 would register a dismissable layer when its reference is set. The local reference and enabled effect in `dismissable-layer/dismissable-layer.tsx` already does this. The local enabled gating and owned events would remain.
- #762 would link Tabs panels to their triggers on the first render and in server output. It would replace the local generated-ID association in `tabs/tabs-root.tsx`, `tabs-content.tsx`, and `tabs-trigger.tsx`.
- #782 (Accordion) and #771 (Resizable) change no captured file.

[The provenance manifest](./provenance.json) records the later ports of Breadcrumbs defaults from #781 and the two Select read guards from #786. It also records the local Menu and Listbox ID and ref repairs.

## Server field associations

Form labels, input IDs, descriptions, and invalid messages register during server construction as well as client effects.
The server context stores ID strings without signal writes and delegates ARIA formatting to external Solid Primitives.
The client uses the external primitive context directly.
The library does not copy that primitive.
Server and client retain the same effect declarations to preserve hydration positions.

Fields render through a shared lazy memo after sibling metadata registers.
The memo gives the returned view one owner in both builds.
Native fields, checkbox and switch inputs, Select triggers, and Combobox inputs use this path.
Combobox controls defer their nested input until later sibling labels register.
Explicit IDs, caller descriptions, conditional messages, and custom label tags keep their supported behavior.
Tag detection reads its initial fallback through `untrack` and tracks later ref and fallback changes in its effect.
Select triggers use the field label when the listbox label has not registered yet.

Collection scroll listeners use an explicit shared effect and the external `makeEventListener` primitive.
The effect occupies the same position in server and client owners.
The primitive releases its listener when the target changes or the owner closes.
This avoids the combobox hydration mismatch caused by a listener helper that returned before declaring its server effect.

## Integrity

From the repository root, run:

```sh
pnpm test:integrity
```

The command tests file hashes, licenses, relative imports, and declared external dependencies.
When source changes, update its local hash after review.
Keep original hashes unchanged unless the upstream revision changes.
Runtime preparation never downloads source.
The inventory and update procedure below complete Beads `table-qp8.1.3`.

## Contextual controls

Popover, DropdownMenu, and Tooltip share the existing Popper and dismissable layer.
Popover and menu scroll locks follow open state, including force-mounted content.
Closed content releases its dismissal layer.
Native Polymorphic elements use the full owned event registry, including pointer entry and exit.
Trigger and item handlers respect caller events that prevent the default action.
Focus callbacks use untracked reads and respect caller focus restoration.
Submenu refs retain direct callback arrays. Escape closes the current menu before its parent.
Menu item close timers and submenu grace timers cancel on disposal.
Tooltip uses a typed plain registry and cancels its owned delay timers on disposal.
Tooltip timer and document callbacks use untracked imperative reads.
These components contain no application commands or services.

Nonmodal Popover and menu focus restoration use the external focus restore primitive.
Popover initial focus and menu focus strategies wait for mounted content and cancel that work on closure.
Selectable collections also cancel their deferred initial focus on disposal.
The defer flag reads accessor values instead of treating the accessor function as enabled.
Deferred focus preserves later navigation, focus changes, and replacement collection elements.
Initial selected-item focus and empty collection strategies retain their existing behavior.
Enabled dismissable layers expose the shared accessibility exemption for nested modal content.
Menu Escape handling runs before list navigation consumes the key.

## Inventory and ownership

The [audit command](../../../../../scripts/audit-vendor.mjs) inventories the generic components package.
Its report records every TypeScript and CSS source, original hash, local hash, and import edge.
An import edge connects a source file to its dependency.
The report distinguishes imports that supply runtime code from imports that supply only types.
It resolves workspace entry points and lists the external package declarations and their importing files.
The existing integrity commands require unchanged license bytes and declared external imports.

| Source                                      | Origin                           | License                   | Inventory                                                              |
| ------------------------------------------- | -------------------------------- | ------------------------- | ---------------------------------------------------------------------- |
| Kobalte Core and Utils                      | Revision recorded above          | Three unchanged MIT files | 215 source files in `provenance.json`                                  |
| Virtual engine                              | `@tanstack/virtual-core` 3.17.11 | Unchanged MIT file        | Three sources in [virtual provenance](../virtual-core/provenance.json) |
| Generic Core helpers                        | Repository-owned source          | Repository MIT license    | `components/src/internal`, outside the vendor directory                |
| Styled controls, Table, and virtual binding | Repository-owned source          | Repository MIT license    | `components/src`, outside the virtual vendor directory                 |

The Table source came from this repository's shared presentation.
The generic wrappers and helpers are repository code, rather than copies of installed component packages.
Both table row modes share the single owned virtual engine.
The virtual engine imports no external runtime package.

Solid and `@solidjs/web` remain external peers.
External runtime imports also include Floating UI, internationalized number formatting, and the declared Solid Primitives packages.
Their exact declarations remain in [the component manifest](../../../package.json).
Kobalte Core and Utils live in `packages/components/src/vendor/kobalte`.
Component wrappers import this owned source through relative paths.
The native Table engine and presentation share `packages/components/src/table`.
Applications create the native engine and pass it to Table presentation.

## Repair locations

The generated comparison patch records every local file difference, including formatting and import changes.
All 215 Kobalte sources differ from their originals, but that count does not represent 215 behavior repairs.
The source families below locate the behavior changes described earlier.

| Repair                                                                             | Source locations                                                                                                                                   |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Owned events and custom `as` forwarding                                            | `core/src/polymorphic`, `core/src/dismissable-layer`, and `components/src/internal/ownedEvents.ts`                                                 |
| Compiler ref handling and viewport-only scrolling                                  | `core/src/select`, `core/src/combobox`, `core/src/selection`, and `utils/src`                                                                      |
| Controlled search, missing selected options, native form values, and announcements | `core/src/combobox`, `core/src/select`, and `core/src/listbox`                                                                                     |
| Controlled boolean values, prevented events, form reset, and label refs            | `core/src/checkbox`, `core/src/switch`, `core/src/radio-group`, `core/src/form-control`, and `components/src/internal/formReset.ts`                |
| Modal focus, background hiding, dismissal, and closed-content cleanup              | `core/src/dialog`, `core/src/popover`, `core/src/menu`, `core/src/dismissable-layer`, and `components/src/internal/controls/modal-hide-outside.ts` |
| Nested menu navigation and timer cleanup                                           | `core/src/menu`, `core/src/selection`, and `core/src/tooltip`                                                                                      |
| Fixed arithmetic measurements and shared virtual modes                             | [Virtual engine repair record](../virtual-core/README.md#local-changes)                                                                            |

The [scroll patch](../../../../../patches/solid-primitives-scroll-3.0.0.patch) repairs an external primitive's owner registry.
It is not a vendored primitive implementation.
Keep its lockfile association until matched upstream evidence permits removal.
Beads `table-gd3.6.7.9`, `table-gd3.6.4`, and `table-gd3.6.5` track existing upstream repair retirement gates.
An upstream release number alone does not prove that a repair is obsolete.

## Produce the audit

From the repository root, run:

```sh
pnpm audit:vendor
```

The report is `test-results/vendor-audit/audit.json`.
The command runs matching, chart, calendar, Kobalte, and virtual integrity guards before it generates the source graph.
It builds the read-only, editing, analytics, and popup fixtures serially without writing their build directories.
Clear `BENCH_DEVELOPMENT`, `BENCH_DISTRIBUTION`, and `BENCH_PROFILE` before this production audit.
Use `--output` to retain a separate report for a candidate update.

The report lists retained modules, their imports, and the bundler's rendered character count for each source group.
It also records final JavaScript and CSS bytes and gzip bytes for each asset.
Each build lists retained external packages with their installed versions, licenses, and package manifest paths.
Rendered character counts describe the bundler's contribution accounting.
They do not measure the download savings from deleting a component.
Shared helpers, compression, and chunk structure affect those savings.
Type-only imports and source barrels can remain in the source inventory without adding browser code.

Compare reports from the same fixtures, runtime, compiler, and build mode.
Use retained module changes and browser behavior to assess a proposed removal.
Keep keyboard, focus, accessibility, controlled values, custom `as`, and cleanup contracts intact.
Do not remove an optional part solely because its source contains many lines.

### Baseline measured on October 14, 2026

This historical measurement predates the single components package.
At that time, the audit inventoried 260 TypeScript and CSS sources across two UI packages.
It found 19 imported package names, including the former Core workspace and native Table type peer.
The remaining 17 names supplied external runtime imports.
Those counts do not describe the current package graph.
Each vendor comparison reproduces its checked-in sources and unchanged licenses exactly.

| Fixture   | JavaScript bytes | Gzip JavaScript bytes | Kobalte modules with code | Kobalte rendered characters | Virtual rendered characters |
| --------- | ---------------: | --------------------: | ------------------------: | --------------------------: | --------------------------: |
| Read-only |          133,518 |                44,158 |                        17 |                      13,682 |                           0 |
| Editing   |          210,863 |                67,103 |                         0 |                           0 |                           0 |
| Analytics |          149,199 |                49,208 |                         0 |                           0 |                      41,138 |
| Popup     |          424,079 |               122,920 |                       176 |                     247,164 |                           0 |

The popup fixture intentionally imports every implemented control family and its test application.
Its total is not the cost of one control or a minimum application bundle.
The read-only fixture retains checkbox behavior without choice or overlay behavior.
Analytics retains the single virtual engine without Kobalte behavior.
CSS assets range from 26,529 to 27,491 bytes because these fixtures import the shared stylesheet.
The report records each asset and its compressed size separately.
These measurements establish a baseline rather than a feature-removal decision.

## Reproduce local patches

Obtain the exact Kobalte revision from the recorded archive URL:

```sh
curl --fail --location --output /tmp/table-kobalte-pinned.tgz https://codeload.github.com/kobaltedev/kobalte/tar.gz/ba6b1df04eeeb3e6cce050e9fce7004e1237bae8
echo 'a8622922ae889a70f8a65d7ec441be805218908bd0cd563fed1250b9794e0947  /tmp/table-kobalte-pinned.tgz' | sha256sum --check
mkdir -p /tmp/table-kobalte-pinned
tar -xzf /tmp/table-kobalte-pinned.tgz --directory=/tmp/table-kobalte-pinned --strip-components=1
```

Download the pinned Virtual archive into a separate temporary directory.
Virtual remains vendored and does not require an installed runtime package.

```sh
curl --fail --location --output /tmp/wfe-virtual-pinned.tgz https://registry.npmjs.org/@tanstack/virtual-core/-/virtual-core-3.17.11.tgz
mkdir -p /tmp/wfe-virtual-pinned
tar -xzf /tmp/wfe-virtual-pinned.tgz --directory=/tmp/wfe-virtual-pinned --strip-components=1
pnpm exec node scripts/audit-vendor.mjs --kobalte-upstream /tmp/table-kobalte-pinned --virtual-upstream /tmp/wfe-virtual-pinned
```

The command first compares each supplied original with its recorded upstream hash.
It then writes `local.patch`, the original tree, and the local tree beneath a fresh comparison directory.
The report records that directory's patch path.
The command replays the patch into a separate copy and requires every resulting hash to match the checked-in source.
It never changes the supplied originals or repository source.
Keep repository-owned helpers and wrappers alongside the vendor source.
The vendor patch references those helpers but does not contain them.

## Update a vendor revision

1. Produce the current audit and verified local patches.
2. Obtain an immutable candidate revision or package archive.
3. Record its archive hash, licenses, and source hashes separately from the current provenance.
4. Compare the current originals with the candidate originals using `git diff --no-index`.
5. Copy the candidate subset into a separate directory.
6. Preserve the full relative import closure and public type exports.
7. Replay the current local patch against that copy with `git apply --check -p2 --directory=<candidate-subset>`.
8. Apply the patch after the check passes.
9. If the check fails, resolve each changed hunk against the upstream change and existing repair contract.
10. Review every repair location before replacing repository source.
11. Update upstream hashes only when the selected upstream origin changes.
12. Update local hashes after formatting and source review.
13. Retain license text and original third-party attribution.
14. Produce the candidate audit with a separate output directory.
15. Run the required tests before committing the update.

Run patch commands from a separate directory outside a Git checkout.
Use a relative candidate directory below the patch command's working directory.
Alternatively, set `GIT_CEILING_DIRECTORIES` to that directory's parent.
Git can silently skip relative patch paths when it discovers an enclosing checkout.
The audit prevents that discovery and requires exact replay hashes.

From the repository root, run the integrity and qualification commands:

```sh
pnpm test:integrity
pnpm test:qualification
```

Qualification includes strict types, lint, source and distribution interactions, server rendering, hydration, and live component reloads.
Run a development popup build and browser suite with the fixture's documented commands.
Keep first failures and candidate audit reports for review.
Scope primitive or Solid version changes separately when they require their own migration.

## Tabs extraction

Tabs adds seven sources from the same pinned origin. The optional animated indicator stays outside this subset.
The root uses the repaired DOM collection accessor and the newer Solid 2 branch selection repair.
The keyboard delegate bounds its search when every item is disabled.
Generated IDs encode values and associate server triggers and panels before client effects run.
Unused upstream ID maps and animated-indicator tracking stay outside this subset.
Root direction controls keyboard navigation independently from translated text.
Trigger activation respects prevented caller events and avoids duplicate native keyboard clicks.
Public wrappers exclude per-part ID overrides and require explicit initial selection.
The list respects native trigger focus while Solid batches focus updates.
Collection lookups compare keys without interpolating them into CSS selectors.
Panel visibility uses immediate selection instead of animation presence.
Retained inactive panels stay hidden and inert. Active-only content disposes immediately.
Panel focus moves to the new trigger when selection closes focused content.
Observers run only for selected panels and disconnect on deactivation or disposal.
The [Tabs contract](../../../../../docs/navigation.md#tabs) records the reviewed Kobalte and Zaidan Solid 2 revisions.

## Breadcrumbs extraction

Breadcrumbs adds its root, separator, context, and translation source from the same pinned origin.
The reviewed Solid 2 branch contains identical originals for these four files.
The public list and item wrappers use native ordered-list semantics through the repaired owned element renderer.
Native anchors retain their destinations, keyboard behavior, and application-supplied handlers.
Current-page text stays noninteractive and exposes `aria-current`.
No router, history handler, or application request enters the component.
The [Breadcrumbs contract](../../../../../docs/navigation.md#breadcrumbs) records the reviewed upstream sources.

## Compound Field mount reads

Combobox derives its default close-on-selection behavior through a getter.
The default follows changes to selection mode.
Its generated input ID is an explicit initialization snapshot.
Explicit input IDs remain reactive.

Selection behavior also takes an explicit initialization snapshot for local state.
The existing effect still responds to later behavior changes.
These repairs address untracked mount reads exposed by inherited Field state.
They preserve diagnostics and upstream source hashes.

Select uses the same reactive close-on-selection default.
Its trigger and value parts snapshot their generated fallback IDs during initialization.
Explicit IDs remain reactive.
The generated-form retention tests exposed these three initialization reads.

Combobox listbox IDs use the same explicit initialization snapshot for generated fallbacks.
Suggestion-count announcements sample the latest translation inside the existing open/count-change event condition.
This preserves the formatter receiver and call timing without adding translation reads to the effect dependencies.
The delayed-reference and collection-key tests exposed these reads.

Development hydration also exposed generated fallback ID reads in the Combobox trigger and Select listbox.
Both use explicit initialization snapshots.
Explicit listbox IDs still update registration through the existing effect.

Listbox item fallback IDs snapshot the parent-generated prefix before adding their unique suffix.
Changing an explicit listbox ID retains mounted option identities.
Explicit item IDs continue to override the fallback.
The dynamic listbox-ID regression exposed this initialization read.

## Native multiple selection

HiddenSelectBase reads every selected native option when a multiple select receives an external change event.
Single selection still reads the native value.
Internal change events retain their existing suppression and do not request selection again.
The existing selection manager remains authoritative.
Owned wrappers still block locked changes and restore rejected controlled requests.

This repair uses the options already present in the hidden select.
It does not expand filtered Combobox collections or change virtualized option rendering.
The native multiple-selection regression supplies all candidate options explicitly.
Original source hashes and licenses remain unchanged.

## Classification registry

`scripts/lib/vendor-inventory.mjs` adapts the six existing manifests for the
source and bundle audit. It does not rewrite manifests, licenses, original
hashes, or repair history. The report retains each raw manifest under `origins`
and lists normalized source, license, extracted, and generated artifacts under
`artifacts`. Source rows refer to those artifacts through `provenance`.

Charts, matching, and generated icon definitions have the same family in source
and bundle reports. Icon definitions retain their many SVG origins and generator
hash; they are not assigned an invented single upstream source hash. The matching
accent helper points to the separate `accentDependency` origin. Unknown vendor
modules fail classification rather than falling through to repository ownership.

The old `owned-core` and `owned-ui` package-split labels are replaced by the
current `components` owner; source rows retain `internal` or `public` layer
metadata. Other local application modules use `application`, and installed
packages remain `external`. Existing report comparisons must use these labels.

Classification is not complete inventory or semantic repair qualification.
The separate integrity guards still verify captured bytes and import boundaries;
repair replay and expanded inventory checks remain separate audit work.

## Delivered notices

The components build copies all nine vendor notice files into each of
`dist/source`, `dist/client`, and `dist/server`, keeping their vendor-relative
paths and exact bytes. The shared inventory is `scripts/lib/vendor-notices.mjs`.
It covers Kobalte's three notices, Calendar, Virtual, Charts, both matching
notices, and the combined ISC/Feather MIT icon notice.

`tests/vendor-notices.test.mjs` verifies the source notice inventory, each built
output, and an extracted local package archive. The archive test runs after the
normal build; it packs locally with lifecycle scripts disabled and publishes
nothing. Source files in the archive do not excuse missing dist notices.
Open Props and font notices continue to travel with the existing styles copy.
The form, generator and shell packages retain their external component package
boundary; this change does not inline code or change the release process.

## Separate mechanical changes from repairs

The [repair replay guide](../../../../../docs/vendor-repair-replay.md) separates formatting and the exact Utils import-path migration from residual repairs.
Its tool verifies the pinned archive and every original/local hash before constructing intermediates.
It replays all stages forward and requires final bytes to match the existing local source.
The residual patch still includes compiler, type, extraction, and behavior changes.
Do not count its files as behavior repairs or treat successful text replay as runtime qualification.
Owned-helper seams and external primitive patches remain required.
Beads `wfe-0dj.3` and `wfe-0dj.5` retain the matched-evidence gates for repair retirement.

## RC18 filtered native selection

Filtering a controlled Combobox can change its option collection while the accepted selection stays the same.
HiddenSelectBase no longer also writes the native select's scalar value.
That write competed with selected option bindings and the existing queued collection reconciliation.
The selection manager remains authoritative. Native option defaults retain server-rendered selected markup.
Native changes restore the currently accepted option set before the event handler returns.
This prevents rejected changes from reaching a later option binding before queued restoration.
The existing effect also restores initial selection synchronously, so multiple selects do not submit an extra empty placeholder.
Its guarded queue still reconciles committed values and replacement option nodes.
Restoration emits no extra event and does not force a reactive flush.

The RC18 development hydration failure was isolated to typing `Be` while `Alpha` remained selected.
The unchanged focused compound review reproduced `UNCOMMITTED_INPUT_OVERWRITTEN`. Removing the competing scalar binding passed the same review with strict diagnostics.
The native selection regression covers retained nodes, form values, rejection, and acceptance; existing multiple-selection cases remain required.
This is a semantic repair, not formatter normalization or upstream repair retirement.
Original hashes and license text remain unchanged.

## Native form reset selection

HiddenSelectBase uses `defaultSelected` for native defaults and server markup.
Its selection effect owns the live `option.selected` properties.
A capture-phase reset listener restores accepted keys after the native reset action, even when the application rejects the reset.
The listener queues restoration before reactive reset updates and cancels pending work after disposal.
Real `form.reset()` tests cover unchanged, accepted, and rejected resets.
An event-only reset test does not exercise the browser default action.
The Everything Form regression passes with strict diagnostics in both themes.
Original upstream hashes and licenses remain unchanged.

ComboboxInput retains its controlled live `value` binding and synchronizes the
native input `defaultValue` to accepted text. The root still owns reset selection
policy. A browser reset therefore cannot clear rejected or unchanged text before
reactive updates, including `form.reset(); flush()` in the same turn. The effect
tracks the input ref and accepted text; it adds no event listener or queued work.
Focused tests cover controlled and uncontrolled selection, accepted input drafts,
accepted/rejected/unchanged resets, canceled native reset, and disposal. Server
markup continues to use the controlled value binding.

# Native tab investigation

Beads `wfe-x6o` tracks an intermittent browser test timeout after a native link opens another tab.
The component assertions remain enabled. No retry or application workaround hides the failure.

## Captured failure

On October 21, 2026, a page containing only a native anchor reproduced the timeout.
The page contained no WFE component, Solid runtime, stylesheet, or application script.
The sequence focused the link, pressed Enter, used browser Back, then used Control-click to open a tab.
Playwright 1.63.0 used its paired Chromium 153.0.8010.12.
The first observation timed out after 30 seconds. The next two fresh contexts passed.

The failed tab received its document response and reported DOMContentLoaded, load, and paint events.
Its target URL changed to the expected destination.
The protocol capture contained no `Page.frameNavigated` event for that tab.
Its initial `Page.getFrameTree` result contained an empty URL. No protocol command remained unanswered.
Playwright waited for the first navigation commit before it exposed the new page.
The installed Chromium adapter resolves that wait from `Page.frameNavigated`.

This evidence identifies a browser and automation initialization failure independent of WFE.
It does not isolate Chromium, Playwright, or the local HTTP bridge as the cause.
It also does not prove that every historical new-tab timeout has the same cause.

The first report is `/tmp/wfe-native-tab-minimal.json`.
Its raw protocol capture is `/tmp/wfe-native-tab-minimal-protocol.log`.
The failed session is `3B7DE677A1EE11C4334EF2F0E9DD5A36`.
The destination loader is `B37AA367A98FAC66DD49BF50265D50B8`.

## Bounded comparisons

A matched-origin comparison used `http://native-tab.test/` without the local HTTP preload.
Direct route fulfillment passed three observations. API fetch followed by fulfillment also passed three observations.
Both used the same plain HTML, browser version, and navigation sequence.
These passes do not establish that the bridge caused the earlier failure.
Reports are `/tmp/wfe-native-tab-fulfill.json` and `/tmp/wfe-native-tab-fetch.json`.

An isolated Playwright 1.64.1 installation used its paired Chromium 156.0.8078.4 and the same local HTTP bridge behavior.
All three observations passed. The report is `/tmp/wfe-native-tab-1641.json`.
This limited comparison does not qualify a repository dependency update or prove a fix.
The repository keeps its existing Playwright pin and browser assertions.
The [1.64.1 release record](https://github.com/microsoft/playwright/releases/tag/v1.64.1) does not identify this reproduction as a fixed issue.

## Matched comparison on October 21

The repository pair reproduced the timeout without the HTTP bridge in the fetch arm.
The first context failed. The next two contexts passed.
The candidate pair passed all three fetch contexts and all three direct fulfillment contexts.
Both pairs passed the fetch arm when the candidate ran first in a bounded reverse-order comparison.
Both pairs also passed three loopback contexts with the bridge in that comparison.

The failed target was `F164C3A476FF15F43E2D0AE0C6A14236`.
Its protocol session was `22310D577CA5E3A10B8449DD2C63C6A1`.
It reported document loading and painting but no `Page.frameNavigated` event.
The HTTP bridge is therefore not required for this reproduction.
The comparison does not isolate Playwright from Chromium or prove that the candidate fixes the intermittent failure.

Reports and protocol logs are in `/tmp/wfe-native-matched-oct21` and `/tmp/wfe-native-reverse-oct21`.
The initial candidate loopback launch failed before browser startup because a temporary resolver used a file URL for a CommonJS package lookup.
That setup error remains in `164-loopback-protocol.log`. It is not a browser observation.
The corrected resolver redirects only Playwright imports and package metadata to the isolated installation.
Its SHA-256 is `71413c0b97c02d907caf375ed406d197254cb24075cbabe9fab1dd4cafd2502d`.
The HTTP bridge SHA-256 is `fc7420d4bb059959529afc1dbbc4c4b65f46170876dd0de7243da5e3e0e0bc0c`.

The candidate uses `--import=/tmp/wfe-native-candidate-loader.mjs` in every arm.
Only loopback adds `--import=/tmp/wfe-chromium-local-http.mjs` for either pair.
The repository fetch and fulfillment arms unset `NODE_OPTIONS`.
Thus `hasPreload: true` in a candidate report does not mean that the HTTP bridge is active.
The reverse-order reports record resolved package paths, browser executables, and identical script and HTML hashes.
The scripts `/tmp/wfe-native-compare.py` and `/tmp/wfe-native-reverse.py` retain the exact commands and environment overrides.

The candidate passed the complete hydration runner in source, distribution, and development modes.
Reports are in `/tmp/wfe-native-candidate-suites`. Each hydration runner built its own fixtures.
The earlier focused component passes used existing assets and do not qualify the current source.

The first broad comparison omitted fixture build stages.
Its pagination case failed on both browser versions because the old gallery assets opened Fields instead of Pagination.
The failure reports remain in `/tmp/wfe-native-candidate-browser-qualification` and `/tmp/wfe-native-pagination-baseline.json`.
The DOM capture `/tmp/wfe-pagination-dom.json` identifies the stale gallery.
This was a comparison harness error, not evidence of a component or browser regression.
The corrected runner includes each fixture build before its browser stage.
It exposed an outdated history assertion after Pagination joined the gallery catalog.
Commit `384f2a9` fixes that assertion under Bead `wfe-9ek` and retains route, current-link, preview, and content checks.
The repaired case passes with the repository browser.

Current source, distribution, and development browser and hydration suites pass with the candidate.
The complete component suite passes 168 cases in each mode.
Reports are in `/tmp/wfe-native-candidate-built-qualification` and `/tmp/wfe-native-candidate-resumed-qualification`.
The resumed run completes 110 stages before the live-development stage fails.
The separate combined hydration reports cover another 26 assertions per mode.

The live-development stage times out after 10 seconds during its initial `page.goto` to `?consumer=1`.
It does not reach the component assertions and is not the native new-tab reproduction.
The log is `/tmp/wfe-native-candidate-resumed-qualification/components-live-browser.log`.
High host load is a possible factor, not an established cause.
The timeout remains unchanged and the failed run remains preserved.

The independent concurrent-preview check passes in `/tmp/wfe-native-candidate-previews.json`.
The candidate still lacks complete qualification. The repository retains Playwright 1.63.0.
Bead `wfe-x6o` remains open for live-development diagnosis and further browser qualification.
The comparison establishes that the HTTP bridge is unnecessary for the original failure, but does not establish a fixed browser version.

## Reproduce

Install the Chromium build paired with the repository Playwright version before these commands.
The script runs three observations in fresh contexts within one browser.
It retains every result and exits unsuccessfully if any observation or cleanup fails.
It does not retry a failed assertion, alter component code, or repair browser initialization.

From the WFE root, run the fetch arm:

```sh
env -u NODE_OPTIONS NATIVE_TAB_MODE=fetch BENCH_OUTPUT=/tmp/native-tab-fetch.json DEBUG=pw:protocol \
  node scripts/reproduce-native-tab.mjs 2>/tmp/native-tab-fetch-protocol.log
```

Run the direct fulfillment arm:

```sh
env -u NODE_OPTIONS NATIVE_TAB_MODE=fulfill BENCH_OUTPUT=/tmp/native-tab-fulfill.json DEBUG=pw:protocol \
  node scripts/reproduce-native-tab.mjs 2>/tmp/native-tab-fulfill-protocol.log
```

Both arms keep the same browser origin and HTML. The fetch arm uses an ephemeral local server through Playwright request routing.
Neither arm needs an application server or changes a preview server.
`NATIVE_TAB_MODE=loopback` instead navigates directly to that local server without adding a route.
Use that mode with the environment's existing HTTP preload when comparing its behavior.
The report records resolved Playwright metadata, the browser executable, and SHA-256 hashes of the script and HTML.
It also records whether `NODE_OPTIONS` contains an import preload, without copying the environment value.
Set `PLAYWRIGHT_BROWSERS_PATH` when the matching browser uses a custom cache.
Keep the first failure report and protocol capture. Treat timings as advisory on a shared host.

The next decision needs a matched failure and passing browser candidate, followed by the complete browser qualification suite.
Keep this issue open until that evidence supports a change.

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
The report records whether `NODE_OPTIONS` contains an import preload, without copying the environment value.
Set `PLAYWRIGHT_BROWSERS_PATH` when the matching browser uses a custom cache.
Keep the first failure report and protocol capture. Treat timings as advisory on a shared host.

The next decision needs a matched failure and passing browser candidate, followed by the complete browser qualification suite.
Keep this issue open until that evidence supports a change.

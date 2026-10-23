# Themes in examples

Normal example hosts mount the public `Theme` component. The existing
`DefaultAppearance` and generator `ExampleAppearance` wrappers delegate to that
same component. A CSS class alone does not own theme decoration or its cleanup.

The gallery owns one theme around its embedded examples. Standalone generator,
platform, shell, grid, status-tile, chart, dashboard, layout, date, form, editing,
read-only table, and analytics pages own their theme at the page boundary.
Popup content uses that owner's portal root. An embedded gallery example does
not add another theme merely to reproduce the default appearance.

Theme owns control typography, palette, decoration, and default sizing. Example
CSS owns page framing, application-specific regions, and custom table layouts.
The shared `page-layout.css` file supplies standalone page margins without
setting document-wide fonts or colors. Generator layouts inherit their theme;
they do not repeat the example sizing profile on each layout component.

Appearance pickers remain application-owned. Their initial light/blue selection
uses the shared defaults, and their other palette choices remain available.
The layout and analytics fixtures retain their explicit density controls. The
custom WAMN grid retains compact density so its existing fixed-height editor
rows keep their original geometry. These are explicit density choices, not
separate palette implementations. Preparing the optional WAMN input remains a
separate step; this change does not modify the upstream application.

## Deliberate exceptions

Raw primitive and interoperability routes in the component fixture test use
without Theme as well as composition within it. The shared-styles fixture tests
raw scopes and the legacy palette. The chart standalone branch tests the chart
without a parent component. ThemeConsumer deliberately tests nested themes.
These fixtures must keep their distinct ownership and isolation checks.

Virtualization-only, accessor profiling, editing-overhead, and heap/performance
fixtures keep their measured baseline scopes. Adding decoration observers to
those workloads would change the workload rather than improve a normal example
page. Their results do not qualify the default themed application appearance.

## Verification

Normal host browser runners check that the main landmark belongs to one real
Theme owner and portal root. Existing interaction cases remain responsible for
appearance changes, retained drafts and nodes, keyboard behavior, popup focus,
and disposal. Review light and dark appearance manually; automated checks do
not compare fixed colors, fonts, or decoration geometry.

After a host change, run its source and built-package browser suites. Run the
existing server-rendering and hydration paths for date, generator, platform,
chart, shell, and shared consumer fixtures when they are affected. Keep the
raw-scope and nested-theme cases too. Optional WAMN qualification requires its
prepared inputs. A prepared source change is not a qualification result.

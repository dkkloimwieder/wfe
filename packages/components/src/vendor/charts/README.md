# Owned chart engine

This source comes from TanStack Charts 1.4.0 at the revision in provenance.json.
The capture follows relative imports from the listed entry points. It includes
shared internal code that the initial public API does not expose.

The public entry is @wfe/components/chart. Framework adapters, Canvas, geographic
charts, network charts and motion remain outside the supported API.
D3 scale, shape and array remain external dependencies. Solid owns the component lifecycle and custom
tooltip content. The engine owns the SVG subtree, measurement and interaction.

Preserve LICENSE and every upstream hash. Record each local repair below and
update its local hash. Never replace the capture with a moving branch.

Run `node scripts/capture-charts.mjs <release source> <empty output directory>`
from the repository root to reproduce this capture. The script verifies each
original hash, applies `repairs.patch`, and verifies every repaired hash.

## Local repairs

The strict-types repair supports the host noUncheckedIndexedAccess and unused-code checks.
Bounded array indices retain their existing invariants. Unused generic names use
a leading underscore. Unused imports and unreachable duplicate tooltip helpers
are removed. Those type repairs do not change the active tooltip path. Each changed file is
listed in provenance.json.

The polar and transform additions use the same strict-types repair. Source-index
assertions follow indices produced from the same bounded data arrays. Unused
imports and generic names receive no runtime replacement.

The runtime-theme repair passes optional runtime defaults through the existing
theme merge path. Authored definitions retain precedence. The portal-mount repair
adds an optional fallback parent so owned UI scopes retain their tokens and
control styles outside the chart container. That mount repair does not change native popovers.

The tooltip-placement repair keeps tooltip cards outside the referenced geometry.
It reuses translated and clipped interaction bounds for rects, dots, and
single-observation areas. Shared line and area paths protect selected observations
locally; grouped selections combine those bounds. Preferred placements use safe
alternate sides when needed. Large cards reflow and scroll inside an available
side region. No placement is shown when no positive free region remains.

The same card surface, containment, and scrolling apply to default and custom
tooltip bodies. Local and portal placement receive the same exclusion bounds;
portals convert those bounds to viewport coordinates. Existing scoped fallback
mounts, pinning, Escape handling, focus, and cleanup remain supported.

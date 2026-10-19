# Owned chart engine

This source comes from TanStack Charts 1.1.0 at the revision in provenance.json.
The capture follows relative imports from the listed entry points. It includes
shared internal code that the initial public API does not expose.

The public entry is @wfe/components/chart. Framework adapters, Canvas, geographic
charts, network charts and motion are outside the supported initial API.
D3 remains an external dependency. Solid owns the component lifecycle and custom
tooltip content. The engine owns the SVG subtree, measurement and interaction.

Preserve LICENSE and every upstream hash. Record each local repair below and
update its local hash. Never replace the capture with a moving branch.

## Local repairs

The strict-types repair supports the host noUncheckedIndexedAccess and unused-code checks.
Bounded array indices retain their existing invariants. Unused generic names use
a leading underscore. Unused imports and unreachable duplicate tooltip helpers
are removed. The active tooltip path remains unchanged. Each changed file is
listed in provenance.json.

The runtime-theme repair passes optional runtime defaults through the existing
theme merge path. Authored definitions retain precedence. The portal-mount repair
adds an optional fallback parent so owned UI scopes retain their tokens and
control styles outside the chart container. Native popovers stay unchanged.

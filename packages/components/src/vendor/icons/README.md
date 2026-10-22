# Icon artwork

Source: https://github.com/lucide-icons/lucide
Tag: 1.61.0
Commit: c29c276f16590cf017126671535ad8c792be64d8

`upstream.json` stores the original bytes of every SVG as JSON strings.
`provenance.json` records upstream hashes and the generated output and generator hashes.
`LICENSE` preserves the upstream ISC license and the MIT notice for Feather-derived artwork.

WFE converts basic SVG geometry into static named definitions with `scripts/icons.mjs`.
WFE replaces root presentation attributes with shared theme styles and non-scaling strokes.
The source geometry and view boxes remain unchanged. Existing WFE triangles remain separate.
No upstream JavaScript package or runtime is included.

# Agent instructions

Read and follow CONTRIBUTING.md before analyzing or changing this repository.
Use Beads for task scope, dependencies, status, and durable handoff.
Run `bd prime` for repository context, then inspect and claim the ready issue.
The parent program is `wfe-w2y`.

This project uses only Solid. Keep package and directory names generic.
Solid and Solid Primitives remain external dependencies.
Keep Table inside the components package, including its native engine.
Use shared styles and one implementation of each control and virtual renderer.
Do not move application rules into components.
Preserve vendor licenses, provenance, local repairs, and supported public behavior.
Use TypeScript 7.0.2, Vitest 5.1.0, Vite 8.3.8, tsdown 0.23.5, and a single Rolldown 1.2.19.
Use Oxlint 1.94.0 for the lint gate. Run type-aware lint separately with Oxlint Tsgolint 7.0.2007.
Keep the existing Solid runtime and compiler pins and the Solid 2 testing library 1.0.0-rc.2.
Run heavy tests serially and preserve the existing preview servers until cutover passes.
Follow user instructions for commits and pushes. Do not publish packages, open pull requests, or synchronize Beads remotes without instruction.

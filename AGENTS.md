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
Keep TypeScript 6.0.3, Vitest 4, and existing runtime and compiler pins during migration.
Run heavy tests serially and preserve the existing preview servers until cutover passes.
Follow user instructions for commits and pushes. Do not publish packages, open pull requests, or synchronize Beads remotes without instruction.

# Contributing

Keep each change focused on one Beads issue.
Read the issue's description, dependencies, and acceptance criteria before editing source.
Use generic components and application-owned rules.
Keep the existing dependency pins during extraction.
Preserve upstream license text, attribution, original hashes, and documented local repairs.

## Development and checks

Use Node 22.12 or newer and pnpm 12.4.1.
From the repository root, install with `pnpm install --frozen-lockfile`.
Run `pnpm check` before committing a change.
It includes the unit suite and runs Node test files serially.
Run relevant unit and browser suites once those sources move into this repository.
Test behavior, accessibility, focus, retained state, and cleanup.
Do not assert exact colors, fonts, shadows, decoration, or cosmetic sizes in automated tests.
Review appearance in the browser. Keep containment and hit tests that protect interaction on different screen sizes.
Run source and built-package cases when exports or runtime behavior change.
Include rendering, hydration, accessibility, and cleanup checks when the change affects those contracts.
Run heavy checks serially and keep first-failure reports.
Treat timings as advisory on a shared host.
Keep current review servers available until replacement previews pass.

## Scope and delivery

Component code owns presentation and generic interaction.
Applications own records, permissions, routing, validation rules, requests, caching, and persistence.
Keep WAMN imports within explicit integration adapters and fixture preparation.
Record source and destination references during migration.
Use focused commits and follow the user's instructions for pushing completed work.
Publish packages or open pull requests only when requested.
Do not synchronize a Beads remote unless requested.
Private workspace changes require no publication changeset.
Before making a package public, scope its release process separately.

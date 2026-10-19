# Plans

Plans describe proposed public behavior and implementation strategy.
They do not replace the [current feature catalog](../features.md) or Beads task status.
Keep accepted requirements and unresolved decisions separate from implemented API documentation.

## Shell, grid, tiles, and labels

- [Owner draft](wfe-shell-grid-tiles.md): supplied requirements, moved from the repository root with formatting changes only.
- [Execution strategy](wfe-shell-execution.md): existing foundations, work order, acceptance criteria, and open decisions.
- [Current functionality](../features.md): what the library already provides.

The draft records its original baseline, `e4ff5bb`.
The chart port is now merged into `main` at `45faa4a`.
Cleanup uses its own branch and must merge before shell implementation begins.
The implementation branch starts from that updated `main`.

The draft limits each epic to three issues and permits one active epic at a time.
Create each epic in Beads when its execution begins.
Keep later work in the design until its turn, without opening parallel epics.

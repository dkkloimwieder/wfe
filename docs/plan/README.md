# Plans

Plans describe proposed public behavior and implementation strategy.
They do not replace the [current feature catalog](../features.md) or Beads task status.
Keep accepted requirements and unresolved decisions separate from implemented API documentation.

## Shell, grid, tiles, and labels

- [Owner draft](wfe-shell-grid-tiles.md): supplied requirements, moved from the repository root, with the later W5–W7 owner additions.
- [Execution strategy](wfe-shell-execution.md): existing foundations, work order, acceptance criteria, and open decisions.
- [Current functionality](../features.md): what the library already provides.

The draft records its original baseline, `e4ff5bb`.
The chart port is now merged into `main` at `45faa4a`.
Cleanup merged from its own branch into `main` at `19bafcb`.
Shell implementation uses the separate `feat/shell-grid-tiles` branch from that commit.

The draft limits each epic to three issues and permits one active epic at a time.
Create each epic in Beads when its execution begins.
Keep later work in the design until its turn, without opening parallel epics.

Owner additions extend the sequence with repeated form groups in W5 and detail/delete views in W6.
The release tag moves to W7 and follows W1 through W6.
Each epic report contains no more than 10 lines.

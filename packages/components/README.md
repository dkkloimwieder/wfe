# Components

This private package provides shared Solid controls, layouts, charts, and tables.

## Package exports

JavaScript conditions select files in this order: `types`, `wfe-source`, `solid`, `node`, then `default`.
The `solid` condition preserves JSX for the consumer compiler, and `node` is the exception for plain Node server rendering.
The `wfe-source` condition is only for wfe's own examples and checks.
`pnpm install` runs `prepare`, which builds `dist`.

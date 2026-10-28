# Generator

This private package renders forms, tables, layouts, grids, and charts from application descriptions.

## Package exports

JavaScript conditions select files in this order: `types`, `wfe-source`, `solid`, `node`, then `default`.
The `solid` condition preserves JSX for the consumer compiler, and `node` is the exception for plain Node server rendering.
The `wfe-source` condition is only for wfe's own examples and checks.
`pnpm install` runs `prepare`, which builds `dist`.

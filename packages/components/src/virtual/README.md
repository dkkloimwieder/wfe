# Virtual presentation

Import `createTableVirtualizer`, `VirtualRows`, and their types from `@wfe/components/virtual`. Both modes share one binding and [owned engine](../vendor/virtual-core/README.md).

Fixed mode takes a count, row height, and key readers. Match the geometry to the UI density. Measured mode takes stable keys and a height estimate. Use `observeRow` for rendered rows and `measurementVersion` to invalidate old heights.

Create the binding in a Solid owner. Supply a scroller through `getScrollElement`. Disposal releases observers. Use `scrollToIndex` or `scrollToKey` to move the viewport.

`VirtualRows` takes a window and `renderRow`. Table mode uses spacer rows, and block mode positions the visible content. The application supplies data, loading, requests, caching, and exports. See the [virtual table example](../../../../examples/README.md#virtualization).

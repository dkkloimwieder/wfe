# Breadcrumbs

Breadcrumbs shows the path to the current screen. Applications supply native link destinations and own navigation and browser history.
The component does not install a router or intercept link activation.
Import the shared stylesheet once. Both the root export and `@wfe/components/breadcrumbs` expose the same components and types.

The root renders a named `nav` element. Its default accessible name is Breadcrumbs.
Supply `aria-label` when a screen contains several navigation regions.
`List` renders an ordered list. Each `Item` renders a list item.
`Link` renders a native anchor and requires an `href`.
`Current` renders a noninteractive span with `aria-current="page"`.
Place one current item at the end of the path.
`Separator` renders an `aria-hidden` span. Place it inside each item after the first, before its label.
The root `separator` prop changes the default slash. A separator can also supply its own children.
Separators are decorative. Keep links and controls outside them.
The shared list wraps at narrow widths and retains visible focus around links.

```tsx
import { Breadcrumbs } from '@wfe/components/breadcrumbs'

export function RecordPath() {
  return (
    <Breadcrumbs aria-label="Record navigation">
      <Breadcrumbs.List>
        <Breadcrumbs.Item>
          <Breadcrumbs.Link href="/records">Records</Breadcrumbs.Link>
        </Breadcrumbs.Item>
        <Breadcrumbs.Item>
          <Breadcrumbs.Separator />
          <Breadcrumbs.Current>Sample record</Breadcrumbs.Current>
        </Breadcrumbs.Item>
      </Breadcrumbs.List>
    </Breadcrumbs>
  )
}
```

The records example uses Breadcrumbs on its View and Edit screens.
The application handles ordinary clicks with its existing history navigation.
Modified clicks retain native link behavior. Back and Forward retain table state.
The reusable fixture at `examples/components/?breadcrumbs=1` also exercises hydration and disposal.

## Upstream review

The root, separator, context, and translation sources come from the existing Kobalte origin, revision `e9d426d438b7c9ea0cc81bd1133831a20cd5fcae`.
Those files match the reviewed [Solid 2 revision `7388d923`](https://github.com/kobaltedev/kobalte/tree/7388d923250f263d6f36cae69fa612bfbf3cf206/packages/core/src/breadcrumbs).
Their original hashes, licenses, and React Spectrum attribution remain intact.
The public native link and current text reuse our owned element renderer.
The optional upstream polymorphic Link implementation stays outside this subset.

We reviewed Zaidan [revision `fcf48df2`](https://github.com/carere/zaidan/blob/fcf48df2ea624c193948aa23ee8b6caee9fca184/src/registry/kobalte/ui/breadcrumb.tsx).
Its wrapper still depends on Solid 1 APIs and styling packages outside our shared system.
Our component follows the semantic compound structure and retains existing tokens and event ownership.
No Zaidan source code or runtime dependency enters this implementation.

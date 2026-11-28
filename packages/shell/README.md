# Application shell

Import `defineShell` and `ShellView` from `@wfe/shell`. The shell composes shared layout, audience selection, navigation, breadcrumbs, and a page heading.

`defineShell` validates serializable metadata and returns the description. Use stable IDs for the description, audiences, routes, and views. Bind each view to a component and each route to an href. Supply the accepted audience and route IDs. Routes without an audience appear in all audience menus.

Ordinary primary clicks request navigation. Modified clicks use native links. Accepted route changes close the drawer and focus the default heading. Initial rendering and hydration retain focus. Remount ShellView to replace the description ID.

Pass `header` to replace the default header. An explicit `null` removes its content. With a custom header, the application owns heading focus. Pass `navigation` to replace the menu. The callback receives `close()`, `compact()`, and `mobile()`. Use `navigation={false}` to hide the pane and toggle.

The shell defaults to `scroll="content"`. Assign a definite height. The application owns history, authorization, route acceptance, requests, and state retention across pages.

Read [adoption](../../docs/adoption.md#described-application-shell) for code, [layout](../../docs/layout.md#dashboard-layout) for regions, and [view messages](../../docs/generator.md#messages-for-generated-views-and-shells) for labels. The [six-route example](../../examples/README.md#shell) supplies application bindings.

# Application shell

`@wfe/shell` describes application navigation through stable audience, route, and view IDs.
Its metadata is serializable. Application bindings supply accepted IDs, hrefs, page components, and change requests.
`defineShell` checks metadata and returns the original description without creating application state.
The description ID identifies the model, not a DOM element. Spaces remain valid in this metadata.
Each mounted `ShellView` generates its own DOM identity, so multiple views can share one description.
Server rendering and hydration retain those identities. Replace the mounted view to change its description ID.

An audience controls menu placement. It does not represent permission or authorization.
Routes without an audience appear in every audience menu.
The application decides which routes to supply and accepts audience and route changes separately.
The shell does not infer a redirect when an audience changes.
Parent route IDs describe breadcrumbs without parsing an address.

Literal descriptions retain audience, route, and view IDs in binding types.
Runtime guards reject malformed metadata, unknown properties, duplicate IDs, unknown references, and parent cycles.

`ShellView` composes the existing DashboardShell, audience SelectField, Breadcrumbs, and page heading.
Bindings supply a component for every referenced view ID and a nonempty href for each route.
The current audience and route must exist in the description.
View bindings must be own properties. The shell reports malformed metadata or bindings with a `Shell:` error.

Ordinary primary link activation requests navigation and leaves acceptance to the application.
Modified clicks retain native link behavior. The package never installs history listeners or parses URLs.
Accepted route changes close the shared narrow drawer. With the default header, they focus the page heading after rendering.
Activating the already-current route also closes navigation and focuses its heading without replacing the page.
Initial rendering and hydration do not move focus. Label and href updates preserve the page owner and its drafts.
The default uses `scroll="content"` so the page can own its scroll region.
Set a definite height on the shell or its parent, as with DashboardShell.
Optional context, footer, style, density, and theme props use the existing layout contract.
The default header supplies one page h1. Page components supply their content without another shell or main landmark.

Pass `header` to replace the entire default header, including its audience selector, breadcrumbs, and heading.
An undefined `header` keeps the default. An explicit `null` removes its content.
With a replacement header, the application owns its page heading and focus behavior.
The shell does not focus a former default heading.

Pass a `navigation` callback to replace the menu inside the existing navigation pane.
The callback receives the owning DashboardShell controls: `close()`, `compact()`, and `mobile()`.
Use those controls with shared navigation components or application content.
An undefined `navigation` keeps the default menu. Set `navigation={false}` to omit the pane and its toggle.
Accepted route changes still close the drawer with a replacement menu.
Application links own their addresses, click handling, and modified-click behavior.
The application also owns hierarchy data, permission filtering, and session actions.
These presentation overrides do not add description fields or change route bindings.

Use the public component stylesheet once in the application.
Read the [layout guide](../../docs/layout.md) and [adoption guide](../../docs/adoption.md) for composition.
The [six-route example](../../examples/shell/README.md) demonstrates application-owned history and generated pages.
Its browser cases cover source, built exports, development rendering, and hydration.

# Shell contracts

`@wfe/shell` describes application navigation through stable audience, route, and view IDs.
Its metadata is serializable. Application bindings supply accepted IDs, hrefs, page components, and change requests.
`defineShell` checks metadata and returns the original description without creating application state.

An audience controls menu placement. It does not represent permission or authorization.
Routes without an audience appear in every audience menu.
The application decides which routes to supply and accepts audience and route changes separately.
The shell does not infer a redirect when an audience changes.
Parent route IDs describe breadcrumbs without parsing an address.

Literal descriptions retain audience, route, and view IDs in binding types.
Runtime guards reject malformed metadata, unknown properties, duplicate IDs, unknown references, and parent cycles.
The renderer will compose existing public layout and controls. This contract change does not add a router or renderer.
See the [execution strategy](../../docs/plan/wfe-shell-execution.md) for the remaining W1 scope.

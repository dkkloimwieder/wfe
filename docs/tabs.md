# Tabs

Tabs shows one related section at a time. Applications own the content, data requests, validation, and routing.
Import the shared stylesheet once. The root export and `@wfe/components/tabs` expose the same components and types.

Supply `value` for application control, or `defaultValue` for local selection.
The explicit initial value keeps server output and browser attachment consistent.
Keep the control mode stable for the component lifetime.
`onValueChange` requests selection. The application can reject the request.
Application prop changes do not request selection.
Use unique, nonempty values for triggers and their matching panels.
The root accepts an ID. Triggers and panels generate their associated IDs, so per-part ID overrides are excluded.

`panelMount="retain"` is the default. All panels mount initially, and inactive panels stay hidden and inert.
Inert content cannot receive keyboard focus. Local drafts and component state survive selection changes.
`panelMount="active"` mounts only the selected content and disposes it immediately after selection changes.
Use this policy when inactive work must stop. Applications own persistence across disposal.
If focus remains inside a closing panel, Tabs moves focus to the selected trigger.
Focus outside the panels stays unchanged.

Arrow keys move between enabled triggers. Horizontal lists support left and right arrows and respect the root `dir` configuration.
Vertical lists support up and down arrows. Home and End move to the first and last enabled triggers.
`activationMode="automatic"` selects during keyboard navigation.
`activationMode="manual"` requires Enter or Space after navigation.
Each list needs an accessible name. The shared styles wrap horizontal triggers on narrow screens.

```tsx
import { Tabs } from '@wfe/components/tabs'

export function RecordSections() {
  return (
    <Tabs defaultValue="details" panelMount="retain">
      <Tabs.List aria-label="Record sections">
        <Tabs.Trigger value="details">Details</Tabs.Trigger>
        <Tabs.Trigger value="notes">Notes</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="details">Application record details</Tabs.Content>
      <Tabs.Content value="notes">Application record notes</Tabs.Content>
    </Tabs>
  )
}
```

The public example is `examples/components/?tabs=1` on the component preview server.
It compares retained drafts with disposed drafts and supports both rendering and hydration tests.

## Upstream review

The behavior comes from Kobalte `solid2` revision `ba6b1df04eeeb3e6cce050e9fce7004e1237bae8`, our Solid 2 vendor origin.
That revision adds the untracked selection write that the owned root already carried, so the root source is unchanged. No runtime dependency changes accompany this extraction.
The original hashes, license, and React Spectrum attribution remain in the vendor record.
The optional animated indicator stays outside this subset. Shared CSS marks selection without another observer dependency.

We also reviewed Zaidan [revision `fcf48df2`](https://github.com/carere/zaidan/tree/fcf48df2ea624c193948aa23ee8b6caee9fca184/src/registry/kobalte/ui).
Its Tabs wrapper still uses `splitProps`, Solid 1 type imports, Tailwind, and class-variance-authority.
We reuse the compound component structure and retain our own tokens and event ownership.
No Zaidan implementation code enters this component.

import { createMemo, createSignal, For, Show } from 'solid-js'
import { Button, Field, FieldGroup, Icon, Input, Label } from '@wfe/components'
import * as catalog from '@wfe/components/icons'

const icons = Object.entries(catalog).map(([exportName, glyph]) => ({
  exportName,
  glyph,
}))
export function IconsExample() {
  const [query, setQuery] = createSignal('')
  const [limit, setLimit] = createSignal(60)
  const [selected, setSelected] = createSignal(
    icons.find((item) => item.exportName === 'iconSearch')!,
  )
  const matches = createMemo(() =>
    icons.filter((item) =>
      item.glyph.name.includes(query().toLowerCase().trim()),
    ),
  )
  return (
    <div class="example-stack">
      <FieldGroup
        title="Icon catalog"
        help="Select an icon to preview it with the shared WFE style."
      >
        <Field>
          <Label>Find icons</Label>
          <Input
            value={query()}
            onValueChange={(value) => {
              setQuery(value)
              setLimit(60)
            }}
          />
        </Field>
        <output role="status" aria-label="Icon results">
          {matches().length} icons
        </output>
      </FieldGroup>
      <FieldGroup title="Selected icon">
        <Button aria-label="Selected icon preview">
          <Icon glyph={selected().glyph} />
          {selected().glyph.name}
        </Button>
        <code>{`import { ${selected().exportName} } from '@wfe/components/icons'`}</code>
        <code>{`<Icon glyph={${selected().exportName}} />`}</code>
      </FieldGroup>
      <div class="gallery-icons" role="group" aria-label="Available icons">
        <For each={matches().slice(0, limit())}>
          {(item) => (
            <Button
              aria-label={item.glyph.name}
              aria-pressed={selected() === item ? 'true' : 'false'}
              onClick={() => setSelected(item)}
            >
              <Icon glyph={item.glyph} />
              <span>{item.glyph.name}</span>
            </Button>
          )}
        </For>
      </div>
      <Show when={matches().length > limit()}>
        <Button onClick={() => setLimit((value) => value + 60)}>
          More icons
        </Button>
      </Show>
    </div>
  )
}

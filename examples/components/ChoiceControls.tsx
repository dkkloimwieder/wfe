import { exampleSizing } from '../shared/appearance/sizing'
import { Button } from '@wfe/components/fields'
import { Combobox, Icon, Select, uiScope } from '@wfe/components'
import { createSignal, flush, onCleanup } from 'solid-js'
import { nativeEvents } from '@wfe/components/events'
import type { JSX } from '@solidjs/web'

type Option = { id: string; label: string; disabled?: boolean }
const initial: Array<Option> = [
  { id: 'alpha', label: 'Alpha' },
  { id: 'beta', label: 'Beta', disabled: true },
  { id: 'gamma', label: 'Gamma' },
]
function CustomItem(
  props: JSX.HTMLAttributes<HTMLDivElement> & { marker: string },
) {
  return <div {...props} data-custom-item={props.marker} />
}
export function ChoiceControls(props: { embedded?: boolean } = {}) {
  const [options, setOptions] = createSignal(initial)
  const [value, setValue] = createSignal<Option | null>(initial[0]!)
  const [query, setQuery] = createSignal('Alpha')
  const [disabled, setDisabled] = createSignal(false)
  const [readOnly, setReadOnly] = createSignal(false)
  const [invalid, setInvalid] = createSignal(false)
  const [loading, setLoading] = createSignal(false)
  const [acceptSearch, setAcceptSearch] = createSignal(true)
  let changes = 0
  let searches = 0
  let pages = 0
  let cleanups = 0
  onCleanup(() => {
    cleanups++
  })
  const change = (next: Option | null) => {
    changes++
    setValue(next)
    setQuery(next?.label ?? '')
  }
  const nextPage = () => {
    pages++
    const id = pages === 1 ? 'delta' : `page-${pages}`
    const label = pages === 1 ? 'Delta' : `Result ${pages}`
    setOptions((old) =>
      old.some((option) => option.id === id) ? old : [...old, { id, label }],
    )
  }
  window.choiceFixture = {
    configure(next) {
      if (next.options) setOptions(next.options)
      if ('value' in next) setValue(next.value ?? null)
      if ('query' in next) setQuery(next.query!)
      if ('disabled' in next) setDisabled(next.disabled!)
      if ('readOnly' in next) setReadOnly(next.readOnly!)
      if ('invalid' in next) setInvalid(next.invalid!)
      if ('loading' in next) setLoading(next.loading!)
      if ('acceptSearch' in next) setAcceptSearch(next.acceptSearch!)
      flush()
    },
    read: () => ({
      value: value()?.id ?? null,
      optionKeys: options().map((option) => option.id),
      query: query(),
      changes,
      searches,
      pages,
      cleanups,
    }),
  }
  return (
    <main
      data-ui=""
      class="example-stack"
      style={
        props.embedded ? undefined : { ...uiScope().style, ...exampleSizing }
      }
      data-ui-portal-root=""
    >
      <h1>Generic choices</h1>
      <form class="example-stack">
        <Select
          options={options()}
          value={value()}
          optionValue="id"
          optionTextValue="label"
          optionDisabled="disabled"
          onChange={change}
          disabled={disabled()}
          readOnly={readOnly()}
          name="category"
          validationState={invalid() ? 'invalid' : 'valid'}
          itemComponent={(item) => (
            <Select.Item as={CustomItem} marker="select" item={item.item}>
              <Select.ItemLabel>{item.item.rawValue.label}</Select.ItemLabel>
              <Select.ItemIndicator class="custom-selection">
                <Icon name="check" />
              </Select.ItemIndicator>
            </Select.Item>
          )}
        >
          <Select.Label>Selected category</Select.Label>
          <Select.HiddenSelect />
          <Select.Trigger>
            <Select.Value<Option>>
              {(state) => state.selectedOption().label}
            </Select.Value>
          </Select.Trigger>
          <Select.Description>Choose a category.</Select.Description>
          <Select.ErrorMessage>Category is required.</Select.ErrorMessage>
          <Select.Portal>
            <Select.Content
              footer={
                <Button type="button" ref={nativeEvents({ click: nextPage })}>
                  More select options
                </Button>
              }
            >
              <Select.Listbox />
            </Select.Content>
          </Select.Portal>
        </Select>
        <Combobox
          options={options()}
          value={value()}
          inputValue={query()}
          onInputChange={(text) => {
            searches++
            if (acceptSearch()) setQuery(text)
          }}
          onChange={change}
          optionValue="id"
          optionTextValue="label"
          optionLabel="label"
          optionDisabled="disabled"
          defaultFilter={() => true}
          disabled={disabled()}
          readOnly={readOnly()}
          validationState={invalid() ? 'invalid' : 'valid'}
          itemComponent={(item) => (
            <Combobox.Item as="div" item={item.item}>
              <Combobox.ItemLabel>
                {item.item.rawValue.label}
              </Combobox.ItemLabel>
              <Combobox.ItemIndicator class="custom-selection">
                <Icon name="check" />
              </Combobox.ItemIndicator>
            </Combobox.Item>
          )}
        >
          <Combobox.Label>Find category</Combobox.Label>
          <Combobox.Control>
            <Combobox.Input />
            <Combobox.Trigger aria-label="Show categories">
              <Combobox.Icon />
            </Combobox.Trigger>
          </Combobox.Control>
          <Combobox.Description>
            Results come from the application.
          </Combobox.Description>
          <Combobox.ErrorMessage>Choose a result.</Combobox.ErrorMessage>
          <Combobox.Portal>
            <Combobox.Content
              status={
                loading()
                  ? 'Loading results'
                  : !options().length
                    ? 'No results'
                    : undefined
              }
              footer={
                <Button type="button" ref={nativeEvents({ click: nextPage })}>
                  More search options
                </Button>
              }
            >
              <Combobox.Listbox />
            </Combobox.Content>
          </Combobox.Portal>
        </Combobox>
        <div class="example-actions">
          <Button
            type="button"
            ref={nativeEvents({ click: () => change(null) })}
          >
            Clear selection
          </Button>
          <Button type="submit">Submit choices</Button>
        </div>
      </form>
      <output aria-label="Choice value">{value()?.id ?? '(empty)'}</output>
    </main>
  )
}
declare global {
  interface Window {
    choiceFixture: {
      configure: (next: {
        options?: Array<Option>
        value?: Option | null
        query?: string
        disabled?: boolean
        readOnly?: boolean
        invalid?: boolean
        loading?: boolean
        acceptSearch?: boolean
      }) => void
      read: () => {
        value: string | null
        optionKeys: Array<string>
        query: string
        changes: number
        searches: number
        pages: number
        cleanups: number
      }
      stop?: () => void
    }
  }
}

import type { ControlDecoration } from '@wfe/components'
import { createMemo, createSignal } from 'solid-js'
import { Combobox, Icon, Input } from '@wfe/components'
import { matchSorter } from '@wfe/components/search'

const items = ['Alpha', 'Gamma', 'Gamma Ray', 'Green Meadow', 'Café']

/** Local matching and caller-supplied ranked results use the same control. */
export function MatchingCombobox(props: {
  mode: 'startsWith' | 'fuzzy'
  decoration?: ControlDecoration
  nativeInput?: boolean
  state?: 'normal' | 'disabled' | 'readonly' | 'invalid'
}) {
  const [query, setQuery] = createSignal('')
  const [value, setValue] = createSignal<string | null>(null)
  const options = createMemo(() =>
    props.mode === 'fuzzy' ? matchSorter(items, query()) : items,
  )
  return (
    <Combobox<string>
      options={options()}
      value={value()}
      inputValue={query()}
      onInputChange={setQuery}
      onChange={(next) => {
        setValue(next)
        setQuery(next ?? '')
      }}
      defaultFilter={props.mode === 'fuzzy' ? () => true : 'startsWith'}
      disabled={props.state === 'disabled'}
      readOnly={props.state === 'readonly'}
      validationState={props.state === 'invalid' ? 'invalid' : 'valid'}
      itemComponent={(item) => (
        <Combobox.Item item={item.item}>
          <Combobox.ItemLabel>{item.item.rawValue}</Combobox.ItemLabel>
          <Combobox.ItemIndicator>
            <Icon name="check" />
          </Combobox.ItemIndicator>
        </Combobox.Item>
      )}
    >
      <Combobox.Label>
        {props.mode === 'fuzzy' ? 'Fuzzy' : 'Starts with'}
      </Combobox.Label>
      <Combobox.Control decoration={props.decoration}>
        <Combobox.Input as={props.nativeInput ? Input : 'input'} />
        <Combobox.Trigger
          aria-label={
            props.mode === 'fuzzy'
              ? 'Show fuzzy matches'
              : 'Show prefix matches'
          }
        >
          <Combobox.Icon />
        </Combobox.Trigger>
      </Combobox.Control>
      <Combobox.Description>
        {props.mode === 'fuzzy'
          ? 'Try gm for Gamma or Green Meadow. Better matches appear first.'
          : 'Try ga for Gamma and Gamma Ray.'}
      </Combobox.Description>
      <Combobox.ErrorMessage>Choose a result.</Combobox.ErrorMessage>
      <Combobox.Portal>
        <Combobox.Content>
          <Combobox.Listbox />
        </Combobox.Content>
      </Combobox.Portal>
    </Combobox>
  )
}

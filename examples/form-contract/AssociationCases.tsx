import { Show, createSignal } from 'solid-js'
import {
  Button,
  Checkbox,
  Combobox,
  Field,
  FieldError,
  HelpText,
  Input,
  Label,
  NativeSelect,
  Select,
  Switch,
  Textarea,
  uiScope,
} from '@wfe/components'
import { App } from './App'

/** Additional public API cases used only by the hydration entry. */
export function HydrationApp(props: Parameters<typeof App>[0]) {
  return (
    <>
      <App {...props} />
      <AssociationCases />
    </>
  )
}
function AssociationCases() {
  const [suffix, setSuffix] = createSignal('a')
  const [help, setHelp] = createSignal(true)
  const [invalid, setInvalid] = createSignal(true)
  const [checked, setChecked] = createSignal(false)
  const [switched, setSwitched] = createSignal(false)
  return (
    <section {...uiScope()} aria-label="Association cases">
      <span id="external-description">Caller description.</span>
      <Field invalid={invalid()}>
        <Label>Custom text</Label>
        <Input
          id={`custom-input-${suffix()}`}
          value="Text"
          aria-describedby="external-description"
        />
        <Show when={help()}>
          <HelpText id={`custom-help-${suffix()}`}>
            Conditional text help.
          </HelpText>
        </Show>
        <FieldError id={`custom-error-${suffix()}`}>Text error.</FieldError>
      </Field>
      <Field>
        <Label>Custom notes</Label>
        <Textarea id="custom-notes" value="Notes" />
        <HelpText>Notes help.</HelpText>
      </Field>
      <Field>
        <Label>Custom choice</Label>
        <NativeSelect id="custom-choice" value="a">
          <option value="a">Alpha</option>
        </NativeSelect>
        <HelpText>Choice help.</HelpText>
      </Field>
      <Field>
        <Label>No description</Label>
        <Input value="Plain" />
        <FieldError>Hidden error.</FieldError>
      </Field>
      <Checkbox
        checked={checked()}
        onChange={setChecked}
        validationState={invalid() ? 'invalid' : 'valid'}
      >
        <Checkbox.Input
          id={`custom-check-${suffix()}`}
          aria-describedby="external-description"
        />
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        <Checkbox.Label id={`custom-check-label-${suffix()}`}>
          Custom check
        </Checkbox.Label>
        <Show when={help()}>
          <Checkbox.Description id={`custom-check-help-${suffix()}`}>
            Conditional check help.
          </Checkbox.Description>
        </Show>
        <Checkbox.ErrorMessage id={`custom-check-error-${suffix()}`}>
          Check error.
        </Checkbox.ErrorMessage>
      </Checkbox>
      <Checkbox>
        <Checkbox.Input aria-label="Standalone check" />
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
      </Checkbox>
      <Checkbox>
        <Checkbox.Input />
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        <Checkbox.Label as="span">Span check</Checkbox.Label>
      </Checkbox>
      <Switch checked={switched()} onChange={setSwitched}>
        <Switch.Input />
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
        <Switch.Label>Automatic switch</Switch.Label>
        <Switch.Description>Switch help.</Switch.Description>
      </Switch>
      <Select
        options={['Alpha', 'Beta']}
        itemComponent={(item) => (
          <Select.Item item={item.item}>
            <Select.ItemLabel>{item.item.rawValue}</Select.ItemLabel>
          </Select.Item>
        )}
      >
        <Select.Trigger>
          <Select.Value<string>>
            {(state) => state.selectedOption()}
          </Select.Value>
        </Select.Trigger>
        <Select.Label>Automatic select</Select.Label>
        <Select.Description>Select help.</Select.Description>
      </Select>
      <Combobox
        value={null}
        inputValue=""
        options={['Alpha', 'Beta']}
        itemComponent={(item) => (
          <Combobox.Item item={item.item}>
            <Combobox.ItemLabel>{item.item.rawValue}</Combobox.ItemLabel>
          </Combobox.Item>
        )}
      >
        <Combobox.Control>
          <Combobox.Input />
        </Combobox.Control>
        <Combobox.Label>Automatic search</Combobox.Label>
        <Combobox.Description>Search help.</Combobox.Description>
      </Combobox>
      <Button onClick={() => setHelp((value) => !value)}>
        Toggle association help
      </Button>
      <Button onClick={() => setInvalid((value) => !value)}>
        Toggle association errors
      </Button>
      <Button onClick={() => setSuffix((value) => (value === 'a' ? 'b' : 'a'))}>
        Change association IDs
      </Button>
    </section>
  )
}

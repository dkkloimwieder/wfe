import { createSignal, flush, onCleanup, Show } from 'solid-js'
import {
  Button,
  Checkbox,
  Combobox,
  Field,
  FieldError,
  HelpText,
  Label,
  RadioGroup,
  Select,
  Switch,
} from '@wfe/components'

type Configuration = {
  disabled: boolean
  readonly: boolean
  required: boolean
  invalid: boolean
  override: boolean | undefined
  accept: boolean
  live: boolean
}
export const compoundFieldLifecycle = {
  configure: (_next: Partial<Configuration>) => {},
  read: () => ({
    requests: [] as Array<{ family: string; value: unknown }>,
    cleanups: 0,
  }),
}
/** Shared controlled controls plus one readonly uncontrolled Select. */
export function CompoundFieldControls() {
  const [state, setState] = createSignal<Configuration>({
    disabled: false,
    readonly: false,
    required: false,
    invalid: true,
    override: undefined,
    accept: true,
    live: true,
  })
  const [checked, setChecked] = createSignal(true)
  const [switched, setSwitched] = createSignal(true)
  const [radio, setRadio] = createSignal('Alpha')
  const [selected, setSelected] = createSignal<string | null>('Alpha')
  const [combined, setCombined] = createSignal<string | null>('Alpha')
  const requests: Array<{ family: string; value: unknown }> = []
  let alive = true,
    cleanups = 0
  onCleanup(() => {
    alive = false
    cleanups++
  })
  compoundFieldLifecycle.configure = (next) => {
    if (alive) {
      setState((previous) => ({ ...previous, ...next }))
      flush()
    }
  }
  compoundFieldLifecycle.read = () => ({ requests: [...requests], cleanups })
  const request = (family: string, value: unknown) => {
    requests.push({ family, value })
    return state().accept
  }
  const aliases = {
    get disabled() {
      return state().override
    },
    get required() {
      return state().override
    },
    get readonly() {
      return state().override
    },
    get invalid() {
      return state().override
    },
  }
  return (
    <section id="compound-field-review" class="example-stack">
      <Show when={state().live}>
        <form
          id="compound-field-form"
          onSubmit={(event) => event.preventDefault()}
        >
          <Field
            disabled={state().disabled}
            readonly={state().readonly}
            required={state().required}
            invalid={state().invalid}
          >
            <Label>Field checkbox</Label>
            <Checkbox
              {...aliases}
              name="checkbox"
              value="checked-value"
              checked={checked()}
              onCheckedChange={(next) => {
                if (request('checkbox', next)) setChecked(next)
              }}
            >
              <Checkbox.Input id="compound-checkbox" />
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
            </Checkbox>
            <HelpText id="compound-checkbox-help">Checkbox help</HelpText>
            <FieldError id="compound-checkbox-error">Checkbox error</FieldError>
          </Field>
          <Field
            disabled={state().disabled}
            readonly={state().readonly}
            required={state().required}
            invalid={state().invalid}
          >
            <Label>Field switch</Label>
            <Switch
              {...aliases}
              name="switch"
              value="switch-value"
              checked={switched()}
              onCheckedChange={(next) => {
                if (request('switch', next)) setSwitched(next)
              }}
            >
              <Switch.Input id="compound-switch" />
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch>
            <HelpText>Switch help</HelpText>
            <FieldError>Switch error</FieldError>
          </Field>
          <Field
            disabled={state().disabled}
            readonly={state().readonly}
            required={state().required}
            invalid={state().invalid}
          >
            <Label>Field radio</Label>
            <RadioGroup
              {...aliases}
              id="compound-radio"
              name="radio"
              value={radio()}
              onValueChange={(next) => {
                if (request('radio', next)) setRadio(next)
              }}
            >
              <RadioGroup.Item value="Alpha">
                <RadioGroup.ItemInput />
                <RadioGroup.ItemControl />
                <RadioGroup.ItemLabel>Radio Alpha</RadioGroup.ItemLabel>
              </RadioGroup.Item>
              <RadioGroup.Item value="Beta">
                <RadioGroup.ItemInput />
                <RadioGroup.ItemControl />
                <RadioGroup.ItemLabel>Radio Beta</RadioGroup.ItemLabel>
              </RadioGroup.Item>
            </RadioGroup>
            <HelpText>Radio help</HelpText>
            <FieldError>Radio error</FieldError>
          </Field>
          <Field
            disabled={state().disabled}
            readonly={state().readonly}
            required={state().required}
            invalid={state().invalid}
          >
            <Label>Field select</Label>
            <Select<string>
              {...aliases}
              options={['Alpha', 'Beta']}
              name="select"
              value={selected()}
              onValueChange={(next) => {
                if (request('select', next)) setSelected(next)
              }}
              itemComponent={(item) => (
                <Select.Item item={item.item}>
                  <Select.ItemLabel>{item.item.rawValue}</Select.ItemLabel>
                </Select.Item>
              )}
            >
              <Select.Trigger id="compound-select">
                <Select.Value<string>>
                  {(value) => value.selectedOption()}
                </Select.Value>
              </Select.Trigger>
              <Select.HiddenSelect />
              <Select.Portal>
                <Select.Content>
                  <Select.Listbox />
                </Select.Content>
              </Select.Portal>
            </Select>
            <HelpText>Select help</HelpText>
            <FieldError>Select error</FieldError>
          </Field>
          <Field
            disabled={state().disabled}
            readonly={state().readonly}
            required={state().required}
            invalid={state().invalid}
          >
            <Label>Field combobox</Label>
            <Combobox<string>
              {...aliases}
              options={['Alpha', 'Beta']}
              name="combobox"
              value={combined()}
              onValueChange={(next) => {
                if (request('combobox', next)) setCombined(next)
              }}
              itemComponent={(item) => (
                <Combobox.Item item={item.item}>
                  <Combobox.ItemLabel>{item.item.rawValue}</Combobox.ItemLabel>
                </Combobox.Item>
              )}
            >
              <Combobox.Control>
                <Combobox.Input id="compound-combobox" />
                <Combobox.Trigger>Open choices</Combobox.Trigger>
              </Combobox.Control>
              <Combobox.HiddenSelect />
              <Combobox.Portal>
                <Combobox.Content>
                  <Combobox.Listbox />
                </Combobox.Content>
              </Combobox.Portal>
            </Combobox>
            <HelpText>Combobox help</HelpText>
            <FieldError>Combobox error</FieldError>
          </Field>
          <Field readonly={state().readonly}>
            <Label>Uncontrolled readonly select</Label>
            <Select<string>
              options={['Alpha', 'Beta', 'Blocked']}
              optionDisabled={(value) => value === 'Blocked'}
              defaultValue="Alpha"
              name="uncontrolled"
            >
              <Select.Trigger id="compound-uncontrolled">
                <Select.Value<string>>
                  {(value) => value.selectedOption()}
                </Select.Value>
              </Select.Trigger>
              <Select.HiddenSelect />
            </Select>
          </Field>
          <Button type="reset">Reset compound fields</Button>
        </form>
      </Show>
    </section>
  )
}

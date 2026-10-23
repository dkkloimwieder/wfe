import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import {
  Checkbox,
  Combobox,
  Field,
  FieldError,
  HelpText,
  Label,
  RadioGroup,
  Select,
  SelectField,
  Switch,
} from '@wfe/components'

beforeEach(() =>
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  })),
)
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
const families = ['checkbox', 'switch', 'radio', 'select', 'combobox'] as const

test.each(families)(
  '%s inherits Field state and associates the actual target with all descriptions',
  (family) => {
    const [locked, setLocked] = createSignal(true)
    const [override, setOverride] = createSignal<boolean | undefined>(undefined)
    const [id, setId] = createSignal('actual-target')
    const changes = vi.fn()
    const h = render(() => {
      const common = {
        get disabled() {
          return override()
        },
        get required() {
          return override()
        },
        get readonly() {
          return override()
        },
        get invalid() {
          return override()
        },
        readOnly: true,
        validationState: 'invalid' as const,
      }
      return (
        <Field
          disabled={locked()}
          readonly={locked()}
          required={locked()}
          invalid={locked()}
        >
          <Label>Outer field</Label>
          <span id="caller-description">Caller description</span>
          {family === 'checkbox' ? (
            <Checkbox {...common} checked={false} onCheckedChange={changes}>
              <Checkbox.Input id={id()} aria-describedby="caller-description" />
              <Checkbox.Control />
            </Checkbox>
          ) : family === 'switch' ? (
            <Switch {...common} checked={false} onCheckedChange={changes}>
              <Switch.Input id={id()} aria-describedby="caller-description" />
              <Switch.Control />
            </Switch>
          ) : family === 'radio' ? (
            <RadioGroup
              {...common}
              id={id()}
              aria-describedby="caller-description"
              value="a"
              onValueChange={changes}
            >
              <RadioGroup.Item value="a">
                <RadioGroup.ItemInput />
                <RadioGroup.ItemLabel>Alpha</RadioGroup.ItemLabel>
              </RadioGroup.Item>
            </RadioGroup>
          ) : family === 'select' ? (
            <Select<string>
              {...common}
              options={['Alpha']}
              value="Alpha"
              onValueChange={changes}
            >
              <Select.Trigger id={id()} aria-describedby="caller-description">
                <Select.Value<string>>
                  {(state) => state.selectedOption()}
                </Select.Value>
              </Select.Trigger>
              <Select.HiddenSelect />
            </Select>
          ) : (
            <Combobox<string>
              {...common}
              options={['Alpha']}
              value="Alpha"
              onValueChange={changes}
            >
              <Combobox.Input id={id()} aria-describedby="caller-description" />
              <Combobox.HiddenSelect />
            </Combobox>
          )}
          <HelpText id="outer-help">Outer help</HelpText>
          <FieldError id="outer-error">Outer error</FieldError>
        </Field>
      )
    })
    flush()
    const target = h.container.querySelector<HTMLElement>('#actual-target')!
    const label = h.getByText('Outer field')
    expect(target.getAttribute('aria-invalid')).toBe('true')
    if (family === 'select') {
      expect(target.closest('[data-readonly]')).not.toBeNull()
      expect(target.closest('[data-required]')).not.toBeNull()
    } else {
      expect(target.getAttribute('aria-readonly')).toBe('true')
      expect(target.getAttribute('aria-required')).toBe('true')
    }
    expect(target.getAttribute('aria-describedby')?.split(/\s+/)).toEqual(
      expect.arrayContaining([
        'caller-description',
        'outer-help',
        'outer-error',
      ]),
    )
    expect(target.getAttribute('aria-labelledby')?.split(/\s+/)).toContain(
      label.id,
    )
    if (family === 'radio') expect(label.hasAttribute('for')).toBe(false)
    else expect(label.getAttribute('for')).toBe(target.id)
    setId('updated-target')
    flush()
    expect(h.container.querySelector('#updated-target') === target).toBe(true)
    if (family !== 'radio')
      expect(label.getAttribute('for')).toBe('updated-target')
    setOverride(false)
    flush()
    expect(target.getAttribute('aria-invalid')).not.toBe('true')
    expect(target.getAttribute('aria-readonly')).not.toBe('true')
    expect(target.getAttribute('aria-required')).not.toBe('true')
    expect(target.getAttribute('aria-disabled')).not.toBe('true')
    setLocked(false)
    flush()
    expect(target.getAttribute('aria-describedby')?.split(/\s+/)).not.toContain(
      'outer-error',
    )
    expect(changes).not.toHaveBeenCalled()
  },
)

test.each(['checkbox', 'switch'] as const)(
  '%s uses one latest canonical callback, retains native events and rejects unaccepted values',
  (family) => {
    const legacy = vi.fn(),
      canonical = vi.fn(),
      replacement = vi.fn(),
      native = vi.fn()
    const [handler, setHandler] = createSignal<(value: boolean) => void>(
      () => canonical,
    )
    const [preferred, setPreferred] = createSignal(true)
    const h = render(() => (
      <form>
        {family === 'checkbox' ? (
          <Checkbox
            checked={false}
            value="submitted-value"
            name="choice"
            onChange={legacy}
            onCheckedChange={preferred() ? handler() : undefined}
          >
            <Checkbox.Input aria-label="Choice" onChange={native} />
            <Checkbox.Control />
          </Checkbox>
        ) : (
          <Switch
            checked={false}
            value="submitted-value"
            name="choice"
            onChange={legacy}
            onCheckedChange={preferred() ? handler() : undefined}
          >
            <Switch.Input aria-label="Choice" onChange={native} />
            <Switch.Control />
          </Switch>
        )}
      </form>
    ))
    const input = h.getByLabelText('Choice') as HTMLInputElement
    fireEvent.click(input)
    flush()
    expect(canonical).toHaveBeenCalledExactlyOnceWith(true)
    expect(legacy).not.toHaveBeenCalled()
    expect(native).toHaveBeenCalled()
    expect(input.checked).toBe(false)
    expect(input.value).toBe('submitted-value')
    setHandler(() => replacement)
    flush()
    fireEvent.click(input)
    flush()
    expect(replacement).toHaveBeenCalledExactlyOnceWith(true)
    setPreferred(false)
    flush()
    fireEvent.click(input)
    flush()
    expect(legacy).toHaveBeenCalledExactlyOnceWith(true)
    expect(h.getByLabelText('Choice') === input).toBe(true)
    h.unmount()
    const count = replacement.mock.calls.length + legacy.mock.calls.length
    fireEvent.click(input)
    flush()
    expect(replacement.mock.calls.length + legacy.mock.calls.length).toBe(count)
  },
)

test('radio group preserves string requests and accepted named values', () => {
  const canonical = vi.fn(),
    legacy = vi.fn()
  const h = render(() => (
    <form>
      <Field>
        <Label>Plan</Label>
        <RadioGroup
          value="a"
          name="plan"
          onChange={legacy}
          onValueChange={canonical}
        >
          <RadioGroup.Item value="a">
            <RadioGroup.ItemInput />
            <RadioGroup.ItemLabel>Alpha</RadioGroup.ItemLabel>
          </RadioGroup.Item>
          <RadioGroup.Item value="b">
            <RadioGroup.ItemInput />
            <RadioGroup.ItemLabel>Beta</RadioGroup.ItemLabel>
          </RadioGroup.Item>
        </RadioGroup>
      </Field>
    </form>
  ))
  fireEvent.click(h.getByRole('radio', { name: 'Beta' }))
  flush()
  expect(canonical).toHaveBeenCalledExactlyOnceWith('b')
  expect(legacy).not.toHaveBeenCalled()
  expect(new FormData(h.container.querySelector('form')!).get('plan')).toBe('a')
})

test.each(['select', 'combobox'] as const)(
  '%s preserves multiple callback payloads and named form/reset values',
  (family) => {
    const canonical = vi.fn(),
      legacy = vi.fn()
    const h = render(() => (
      <form>
        {family === 'select' ? (
          <Select<string>
            multiple
            name="values"
            options={['Alpha', 'Beta']}
            defaultValue={['Alpha']}
            onChange={legacy}
            onValueChange={canonical}
          >
            <Select.Trigger aria-label="Values">
              <Select.Value<string>>
                {(state) => state.selectedOptions().join(', ')}
              </Select.Value>
            </Select.Trigger>
            <Select.HiddenSelect />
          </Select>
        ) : (
          <Combobox<string>
            multiple
            name="values"
            options={['Alpha', 'Beta']}
            defaultValue={['Alpha']}
            onChange={legacy}
            onValueChange={canonical}
          >
            <Combobox.Input aria-label="Values" />
            <Combobox.HiddenSelect />
          </Combobox>
        )}
      </form>
    ))
    flush()
    expect(
      new FormData(h.container.querySelector('form')!).getAll('values'),
    ).toEqual(['Alpha'])
    fireEvent.reset(h.container.querySelector('form')!)
    flush()
    expect(legacy).not.toHaveBeenCalled()
    expect(
      canonical.mock.calls.every(([values]) => Array.isArray(values)),
    ).toBe(true)
    expect(
      new FormData(h.container.querySelector('form')!).getAll('values'),
    ).toEqual(['Alpha'])
  },
)

test('readonly uncontrolled Select keeps its named value and caller option policy after unlocking', () => {
  const [readonly, setReadonly] = createSignal(true)
  const change = vi.fn()
  const h = render(() => (
    <form>
      <Field readonly={readonly()}>
        <Label>Immutable choice</Label>
        <Select<string>
          name="choice"
          options={['Alpha', 'Beta', 'Blocked']}
          defaultValue="Alpha"
          optionDisabled={(value) => value === 'Blocked'}
          onValueChange={change}
        >
          <Select.Trigger>
            <Select.Value<string>>
              {(state) => state.selectedOption()}
            </Select.Value>
          </Select.Trigger>
          <Select.HiddenSelect />
        </Select>
      </Field>
    </form>
  ))
  const trigger = h.getByRole('button', { name: /Immutable choice/ })
  trigger.focus()
  fireEvent.keyDown(trigger, { key: 'ArrowRight' })
  fireEvent.keyDown(trigger, { key: 'b' })
  flush()
  expect(change).not.toHaveBeenCalled()
  expect(new FormData(h.container.querySelector('form')!).get('choice')).toBe(
    'Alpha',
  )
  setReadonly(false)
  flush()
  fireEvent.keyDown(trigger, { key: 'ArrowRight' })
  flush()
  expect(new FormData(h.container.querySelector('form')!).get('choice')).toBe(
    'Beta',
  )
  fireEvent.keyDown(trigger, { key: 'ArrowRight' })
  flush()
  expect(new FormData(h.container.querySelector('form')!).get('choice')).toBe(
    'Beta',
  )
})

test.each(['select', 'combobox'] as const)(
  '%s readonly native change and autofill preserve accepted state and named value',
  async (family) => {
    const [readonly, setReadonly] = createSignal(true)
    const request = vi.fn(),
      native = vi.fn()
    const h = render(() => (
      <form>
        <Field readonly={readonly()}>
          {family === 'select' ? (
            <Select<string>
              name="choice"
              options={['Alpha', 'Beta']}
              defaultValue="Alpha"
              onValueChange={request}
            >
              <Select.Trigger aria-label="Choice">
                <Select.Value<string>>
                  {(state) => state.selectedOption()}
                </Select.Value>
              </Select.Trigger>
              <Select.HiddenSelect onChange={native} />
            </Select>
          ) : (
            <Combobox<string>
              defaultFilter={() => true}
              name="choice"
              options={['Alpha', 'Beta']}
              defaultValue="Alpha"
              onValueChange={request}
            >
              <Combobox.Input aria-label="Choice" />
              <Combobox.HiddenSelect onChange={native} />
            </Combobox>
          )}
        </Field>
      </form>
    ))
    const select = h.container.querySelector('select')!
    expect(Array.from(select.options, (option) => option.value)).toContain(
      'Beta',
    )
    const form = h.container.querySelector('form')!
    fireEvent.change(select, { target: { value: 'Beta' } })
    flush()
    await Promise.resolve()
    expect(native).toHaveBeenCalledTimes(1)
    expect(request).not.toHaveBeenCalled()
    expect(new FormData(form).get('choice')).toBe('Alpha')
    setReadonly(false)
    flush()
    fireEvent.change(select, { target: { value: 'Beta' } })
    flush()
    await Promise.resolve()
    expect(request).toHaveBeenCalledExactlyOnceWith('Beta')
    expect(new FormData(form).get('choice')).toBe('Beta')
  },
)

test.each(['select', 'combobox'] as const)(
  '%s restores native selection after a rejected controlled change',
  async (family) => {
    const request = vi.fn()
    const h = render(() => (
      <form>
        {family === 'select' ? (
          <Select<string>
            name="choice"
            options={['Alpha', 'Beta']}
            value="Alpha"
            onValueChange={request}
          >
            <Select.Trigger aria-label="Choice">
              <Select.Value<string>>
                {(state) => state.selectedOption()}
              </Select.Value>
            </Select.Trigger>
            <Select.HiddenSelect />
          </Select>
        ) : (
          <Combobox<string>
            defaultFilter={() => true}
            name="choice"
            options={['Alpha', 'Beta']}
            value="Alpha"
            onValueChange={request}
          >
            <Combobox.Input aria-label="Choice" />
            <Combobox.HiddenSelect />
          </Combobox>
        )}
      </form>
    ))
    const select = h.container.querySelector('select')!
    expect(Array.from(select.options, (option) => option.value)).toContain(
      'Beta',
    )
    fireEvent.change(select, { target: { value: 'Beta' } })
    flush()
    await Promise.resolve()
    expect(request).toHaveBeenCalledExactlyOnceWith('Beta')
    expect(new FormData(h.container.querySelector('form')!).get('choice')).toBe(
      'Alpha',
    )
  },
)

test('SelectField explicit invalid false overrides an invalid Field without replacing its registered trigger', () => {
  const [invalid, setInvalid] = createSignal<boolean | undefined>(false)
  const h = render(() => (
    <Field invalid>
      <Label>Outer selection</Label>
      <SelectField
        label="Selection"
        invalid={invalid()}
        choices={[{ value: 'a', label: 'Alpha' }]}
        value="a"
        onValueChange={() => {}}
      />
    </Field>
  ))
  const trigger = h.getByRole('button', { name: /Selection/ })
  const label = h.getByText('Outer selection')
  expect(trigger.getAttribute('aria-invalid')).not.toBe('true')
  expect(label.getAttribute('for')).toBe(trigger.id)
  setInvalid(undefined)
  flush()
  expect(trigger.getAttribute('aria-invalid')).toBe('true')
  setInvalid(false)
  flush()
  expect(trigger.getAttribute('aria-invalid')).not.toBe('true')
  expect(h.getByRole('button', { name: /Selection/ }) === trigger).toBe(true)
  expect(label.getAttribute('for')).toBe(trigger.id)
})

test.each(['select', 'combobox'] as const)(
  '%s readonly multiple native change retains every accepted named option across transitions',
  async (family) => {
    const [readonly, setReadonly] = createSignal(true)
    const request = vi.fn(),
      native = vi.fn()
    const h = render(() => (
      <form>
        <Field readonly={readonly()}>
          {family === 'select' ? (
            <Select<string>
              multiple
              name="choices"
              options={['Alpha', 'Beta', 'Gamma']}
              defaultValue={['Alpha', 'Beta']}
              onValueChange={request}
            >
              <Select.Trigger aria-label="Choices">
                <Select.Value<string>>
                  {(state) => state.selectedOptions().join(', ')}
                </Select.Value>
              </Select.Trigger>
              <Select.HiddenSelect onChange={native} />
            </Select>
          ) : (
            <Combobox<string>
              multiple
              name="choices"
              options={['Alpha', 'Beta', 'Gamma']}
              defaultValue={['Alpha', 'Beta']}
              onValueChange={request}
            >
              <Combobox.Input aria-label="Choices" />
              <Combobox.HiddenSelect onChange={native} />
            </Combobox>
          )}
        </Field>
      </form>
    ))
    const form = h.container.querySelector('form')!
    const select = form.querySelector('select')!
    await Promise.resolve()
    expect(new FormData(form).getAll('choices')).toEqual(['Alpha', 'Beta'])
    for (const locked of [true, false, true]) {
      setReadonly(locked)
      flush()
      await Promise.resolve()
      if (!locked) continue
      const count = request.mock.calls.length
      fireEvent.change(select, { target: { value: 'Gamma' } })
      flush()
      await Promise.resolve()
      expect(new FormData(form).getAll('choices')).toEqual(['Alpha', 'Beta'])
      expect(request).toHaveBeenCalledTimes(count)
    }
    expect(native).toHaveBeenCalledTimes(2)
  },
)

test.each(['checkbox', 'switch'] as const)(
  '%s combines Field, primitive and caller associations without replacing the target',
  (family) => {
    const [id, setId] = createSignal('combined-target')
    const [callerLabel, setCallerLabel] = createSignal('caller-label')
    const [callerHelp, setCallerHelp] = createSignal('caller-help')
    const h = render(() => {
      const Root = family === 'checkbox' ? Checkbox : Switch
      const Input = family === 'checkbox' ? Checkbox.Input : Switch.Input
      const OwnLabel = family === 'checkbox' ? Checkbox.Label : Switch.Label
      const Description =
        family === 'checkbox' ? Checkbox.Description : Switch.Description
      const ErrorMessage =
        family === 'checkbox' ? Checkbox.ErrorMessage : Switch.ErrorMessage
      return (
        <Field invalid>
          <Label>Outer name</Label>
          <span id="caller-label">Caller name</span>
          <span id="other-label">Other name</span>
          <span id="caller-help">Caller help</span>
          <span id="other-help">Other help</span>
          <Root>
            <Input
              id={id()}
              aria-labelledby={callerLabel()}
              aria-describedby={callerHelp()}
            />
            <OwnLabel>Primitive name</OwnLabel>
            <Description>Primitive help</Description>
            <ErrorMessage>Primitive error</ErrorMessage>
          </Root>
          <HelpText>Outer help</HelpText>
          <FieldError>Outer error</FieldError>
        </Field>
      )
    })
    flush()
    const target = h.container.querySelector<HTMLInputElement>('input')!
    const assertAssociations = () => {
      const labelIds = target.getAttribute('aria-labelledby')?.split(/\s+/)
      const descriptionIds = target
        .getAttribute('aria-describedby')
        ?.split(/\s+/)
      expect(labelIds).toEqual(
        expect.arrayContaining([
          callerLabel(),
          h.getByText('Outer name').id,
          h.getByText('Primitive name').id,
        ]),
      )
      expect(descriptionIds).toEqual(
        expect.arrayContaining([
          callerHelp(),
          ...[
            'Primitive help',
            'Primitive error',
            'Outer help',
            'Outer error',
          ].map((text) => h.getByText(text).id),
        ]),
      )
      expect(h.getByText('Outer name').getAttribute('for')).toBe(target.id)
      expect(h.getByText('Primitive name').getAttribute('for')).toBe(target.id)
      for (const reference of [...labelIds!, ...descriptionIds!])
        expect(document.getElementById(reference)).not.toBeNull()
    }
    assertAssociations()
    setId('updated-combined-target')
    setCallerLabel('other-label')
    setCallerHelp('other-help')
    flush()
    expect(
      h.container.querySelector('#updated-combined-target') === target,
    ).toBe(true)
    assertAssociations()
    expect(target.getAttribute('aria-labelledby')?.split(/\s+/)).not.toContain(
      'caller-label',
    )
    expect(target.getAttribute('aria-describedby')?.split(/\s+/)).not.toContain(
      'caller-help',
    )
  },
)

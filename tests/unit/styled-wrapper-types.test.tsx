import { expect, expectTypeOf, test } from 'vitest'
import {
  Checkbox,
  Switch,
  RadioGroup,
  Select,
  Combobox,
  Dialog,
  BUTTON_TONES,
  BUTTON_VARIANTS,
  VALUE_FORMATS,
  isButtonTone,
  isButtonVariant,
  isValueFormat,
} from '@wfe/components'
import type * as Root from '@wfe/components'
import type * as CheckboxPath from '@wfe/components/checkbox'
import type * as SwitchPath from '@wfe/components/switch'
import type * as RadioPath from '@wfe/components/radio-group'
import type * as SelectPath from '@wfe/components/select'
import type * as ComboboxPath from '@wfe/components/combobox'
import type * as DialogPath from '@wfe/components/dialog'
import type * as AlertPath from '@wfe/components/alert-dialog'
import type * as PopoverPath from '@wfe/components/popover'
import type * as MenuPath from '@wfe/components/dropdown-menu'
import type * as TooltipPath from '@wfe/components/tooltip'
import { Select as SubpathSelect } from '@wfe/components/select'
import { Combobox as SubpathCombobox } from '@wfe/components/combobox'
import {
  validateActions,
  validatePresentation,
} from '../../packages/generator/src/shared'

// Compiled by the strict unit project, never rendered without an owner.
function consumerExamples() {
  const checkbox = {
    decoration: 'primary',
    class: ['compact', { active: true }],
  } satisfies Root.CheckboxRootProps
  const toggle = {
    decoration: false,
    class: { compact: true },
  } satisfies SwitchPath.SwitchRootProps
  const radio = {
    decoration: 'secondary',
    class: ['compact'],
  } satisfies RadioPath.RadioGroupRootProps
  const trigger = {
    decoration: 'neutral',
    class: ['compact'],
  } satisfies SelectPath.SelectTriggerProps<'button'>
  const control = {
    decoration: 'primary',
    class: ['compact'],
  } satisfies ComboboxPath.ComboboxControlProps<string>
  const content = {
    class: ['compact'],
    footer: 'Help',
    status: 'Ready',
  } satisfies Root.SelectContentProps
  const ref = {
    ref: (node: HTMLInputElement) => node.checked,
  } satisfies CheckboxPath.CheckboxInputProps<'input'>
  const single = {
    options: ['a'],
    multiple: false,
    value: 'a',
    onChange: (value: string | null) => value,
  } satisfies Root.SelectRootProps<string>
  const multiple = {
    options: ['a'],
    multiple: true,
    value: ['a'],
    onChange: (value: string[]) => value,
  } satisfies ComboboxPath.ComboboxRootProps<string>
  const option = { id: 'a', label: 'Alpha' }
  const group = { title: 'Group', children: [option] }
  const grouped = {
    options: [group],
    optionGroupChildren: 'children',
    optionValue: 'id',
    optionTextValue: 'label',
  } satisfies SelectPath.SelectRootProps<typeof option, typeof group>
  void (
    <Checkbox {...checkbox}>
      <Checkbox.Input<'input'> {...ref} />
    </Checkbox>
  )
  void (<Switch {...toggle} />)
  void (<RadioGroup {...radio} />)
  void (
    <Select {...single}>
      <Select.Trigger {...trigger} />
      <Select.Content {...content} />
    </Select>
  )
  void (
    <SubpathCombobox<string> {...multiple}>
      <Combobox.Control<string> {...control} />
    </SubpathCombobox>
  )
  void (
    <SubpathSelect<typeof option, typeof group>
      {...grouped}
      onChange={(value) => {
        expectTypeOf(value).toEqualTypeOf<typeof option | null>()
      }}
    />
  )
  void (
    <Combobox
      options={[option]}
      multiple
      onChange={(values) => {
        expectTypeOf(values).toEqualTypeOf<(typeof option)[]>()
      }}
    />
  )
  void (
    <Select
      options={[option]}
      onChange={(value) => {
        expectTypeOf(value).toEqualTypeOf<typeof option | null>()
      }}
    />
  )
  void (<Select.Trigger<'a'> as="a" href="/items" decoration="primary" />)
  void (<Dialog.Trigger<'a'> as="a" href="/open" variant="outline" />)
  // @ts-expect-error A default button does not accept anchor-only attributes.
  void (<Select.Trigger<'button'> href="/items" />)
  // @ts-expect-error Decoration uses the owned neutral/primary/secondary tokens.
  void (<Checkbox decoration="rainbow" />)
  // @ts-expect-error Single selection cannot accept an array.
  void (<SubpathSelect<string> options={[]} multiple={false} value={[]} />)
  // @ts-expect-error Multiple selection cannot accept a scalar.
  void (<Select<string> options={[]} multiple value="a" />)
  // @ts-expect-error Single combobox selection cannot accept an array.
  void (<Combobox<string> options={[]} multiple={false} value={[]} />)
  // @ts-expect-error Multiple combobox selection cannot accept a scalar.
  void (<SubpathCombobox<string> options={[]} multiple value="a" />)
  // @ts-expect-error Native submission values for checkboxes remain strings.
  void (<Checkbox value={true} />)
}
void consumerExamples

test('root and subpath names describe the same styled wrappers', () => {
  expectTypeOf<Root.CheckboxRootProps>().toEqualTypeOf<CheckboxPath.CheckboxRootProps>()
  expectTypeOf<Root.SwitchRootProps>().toEqualTypeOf<SwitchPath.SwitchRootProps>()
  expectTypeOf<Root.RadioGroupRootProps>().toEqualTypeOf<RadioPath.RadioGroupRootProps>()
  expectTypeOf<Root.SelectTriggerProps<'a'>>().toEqualTypeOf<
    SelectPath.SelectTriggerProps<'a'>
  >()
  expectTypeOf<Root.SelectContentProps>().toEqualTypeOf<SelectPath.SelectContentProps>()
  expectTypeOf<Root.SelectRootProps<string>>().toEqualTypeOf<
    SelectPath.SelectRootProps<string>
  >()
  expectTypeOf<Root.ComboboxControlProps<string>>().toEqualTypeOf<
    ComboboxPath.ComboboxControlProps<string>
  >()
  expectTypeOf<Root.ComboboxRootProps<string>>().toEqualTypeOf<
    ComboboxPath.ComboboxRootProps<string>
  >()
  expectTypeOf<Root.DialogContentProps>().toEqualTypeOf<DialogPath.DialogContentProps>()
  expectTypeOf<Root.AlertDialogOverlayProps>().toEqualTypeOf<AlertPath.AlertDialogOverlayProps>()
  expectTypeOf<Root.PopoverContentProps>().toEqualTypeOf<PopoverPath.PopoverContentProps>()
  expectTypeOf<Root.DropdownMenuItemProps>().toEqualTypeOf<MenuPath.DropdownMenuItemProps>()
  expectTypeOf<Root.TooltipContentProps>().toEqualTypeOf<TooltipPath.TooltipContentProps>()
  // Explicit compatibility exports still support existing type-only imports.
  expectTypeOf<
    SelectPath.SelectSingleSelectionOptions<string>
  >().toHaveProperty('multiple')
  expectTypeOf<ComboboxPath.ComboboxControlOptions<string>>().toHaveProperty(
    'children',
  )
  expectTypeOf<DialogPath.DialogContentOptions>().toBeObject()
})

test('generator validation shares the public finite button and format contracts', () => {
  for (const variant of BUTTON_VARIANTS) {
    expect(isButtonVariant(variant)).toBe(true)
    for (const tone of BUTTON_TONES) {
      expect(isButtonTone(tone)).toBe(true)
      expect(() =>
        validateActions([], undefined, {
          id: 'save',
          label: 'Save',
          variant,
          tone,
        }),
      ).not.toThrow()
    }
  }
  for (const format of VALUE_FORMATS) {
    expect(isValueFormat(format)).toBe(true)
    expect(() => validatePresentation({ format }, 'field')).not.toThrow()
  }
  for (const invalid of ['made-up', '', null, 42, {}]) {
    expect(isButtonVariant(invalid)).toBe(false)
    expect(isButtonTone(invalid)).toBe(false)
    expect(isValueFormat(invalid)).toBe(false)
  }
})

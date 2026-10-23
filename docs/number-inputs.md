# Numeric inputs

`NumberInput` edits a controlled `number | undefined` value through the shared `Input` component.
It accepts finite decimal numbers and exponent notation, such as `-0.5`, `.25`, and `1e-7`.
It rejects hexadecimal values, thousands separators, `NaN`, and `Infinity`.
Values use JavaScript number precision. The control does not provide exact decimal storage, currency formatting, or locale parsing.

The control keeps a local text draft. Incomplete text such as `-`, `1.`, or `1e-` stays visible and does not publish a value.
Complete accepted edits preserve their spelling while the input retains focus.
After focus leaves, a valid draft returns to the accepted value's standard spelling. This also restores a complete edit that the application rejects.
Temporary focus loss during a field or panel move preserves its text and selection.
Invalid drafts remain visible after blur. Escape restores the accepted value, and an external change to that value replaces the draft.
An unchanged accepted value preserves the draft through unrelated parent updates.

The change callback receives a finite number or `undefined`. Empty text requests `undefined` by default.
Set `allowEmpty={false}` to retain empty text as an intrinsic error, an error that prevents a numeric value from forming.
Optional finite `min` and `max` constraints also prevent publication outside their bounds. The control does not clamp or round values.
The control provides no increment buttons or step validation.

The component inherits shared Field labels, help, errors, disabled state, readonly state, and native required attributes.
Native required validation remains separate from intrinsic numeric errors.
The visible input uses a decimal keyboard hint. A named hidden input serializes the accepted value, including its external form association.
Invalid numeric text sets native custom validity and `data-ui-invalid-input` on the visible input.
The optional `onValidityChange` callback reports intrinsic validity, including its initial state. Disabled and readonly controls report true.
Normal parent updates do not emit value changes. Owned input listeners stop callbacks after disposal.

```tsx
import { createSignal } from 'solid-js'
import { Field, Label, NumberInput } from '@wfe/components'

export function NumericAmount() {
  const [amount, setAmount] = createSignal<number | undefined>(undefined)
  return (
    <Field>
      <Label>Amount</Label>
      <NumberInput name="amount" value={amount()} onValueChange={setAmount} />
    </Field>
  )
}
```

The root export and `@wfe/components/number-input` expose `NumberInput` and `NumberInputProps`.
Import `@wfe/components/styles.css` once for the shared input and error styles.

## Generated fields

`FormView` supports `control: 'number'` for fields whose type contains the full `number` type.
A nonnullable number defaults to `empty: 'reject'`. Blank local text then blocks submission while the accepted value remains unchanged.
An optional field requires `empty: 'undefined'`. A nullable field requires `empty: 'null'`.
A field that permits both empty values can select either policy.
Numeric literal unions require a custom control because arbitrary numeric edits cannot fit a fixed set of values.

```tsx
import type { FormDescription } from '@wfe/generator'

type NumericValues = {
  count: number
  quantity: number | undefined
  declaredValue: number | null
}

export const numericDescription = {
  id: 'numeric-editor',
  fields: [
    { field: 'count', label: 'Count', control: 'number' },
    {
      field: 'quantity',
      label: 'Quantity',
      control: 'number',
      empty: 'undefined',
    },
    {
      field: 'declaredValue',
      label: 'Declared value',
      control: 'number',
      empty: 'null',
    },
  ],
} as const satisfies FormDescription<NumericValues>
```

During native submission, `FormView` focuses the first intrinsic error and prevents a request with an older accepted number.
It uses the shared input marker, including markers inside custom fields. Disabled fields, readonly fields, and inputs associated with another form do not block.
Ordinary required checks and business validation still belong to the application when `FormView` uses `novalidate`.
Calling the application coordinator directly uses accepted values and bypasses this view-level draft guard.
The form coordinator and its request behavior remain unchanged.

The records example keeps its custom Quantity field as a thin wrapper around `NumberInput` to demonstrate extension and cleanup.
The dispatch example uses a generated nullable number for Declared value.

## UI messages

NumberInput accepts `messages?: Partial<NumberInputMessages>` for required, invalid, minimum, and maximum errors.
Import `NumberInputMessages` and the English `numberInputMessages` defaults from `@wfe/components`.
Minimum and maximum message callbacks receive the numeric limit.
Messages do not change the numeric parser, accepted values, hidden form value, or input format.
Changing messages retains incomplete drafts and focus, updates native validation text, and does not repeat an unchanged validity callback or request a new value.

Overrides resolve per property and remain reactive; omitted properties use the English defaults.
Validation reasons are independent of translated text. An empty translated error retains native invalidity by falling back to the English error for native validation.
Use matching initial messages for server rendering and hydration. No translation service or application policy is added.

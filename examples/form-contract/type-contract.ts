import { createForm } from '@wfe/form'
import type { FormContract, FormErrors } from '@wfe/form'
import type { ExampleValues } from './values'

/** Compile-time examples of the public field/value boundary. */
export function typedFields(form: FormContract<ExampleValues>) {
  form.setValue('name', 'Record')
  form.setValue('enabled', false)
  // @ts-expect-error Boolean fields reject text values.
  form.setValue('enabled', 'false')
  // @ts-expect-error Unknown fields cannot enter this form.
  form.setValue('unknown', true)
  const errors: FormErrors<ExampleValues> = {
    fields: { name: 'Enter a name.' },
  }
  const invalid: FormErrors<ExampleValues> = {
    // @ts-expect-error Error keys belong to the same value type.
    fields: { unknown: 'Missing field' },
  }
  return { errors, invalid }
}

interface CustomValues {
  title: string
  count: number
  enabled: boolean
  note?: string | null
}
export function customFields(
  values: () => Readonly<CustomValues>,
  accept: (value: Readonly<CustomValues>) => void,
) {
  const form = createForm({
    values,
    defaults: values,
    onValuesChange: accept,
    validate: () => ({}),
    onSubmit: () => ({ ok: true }),
  })
  form.setValue('count', 0)
  form.setValue('note', null)
  form.setValue('note', undefined)
  // @ts-expect-error Numeric fields reject text values.
  form.setValue('count', 'zero')
  // @ts-expect-error Unknown fields cannot enter an inferred form.
  form.setValue('missing', false)
  return form
}
// @ts-expect-error Nested values are outside the scalar form contract.
export type NestedForm = FormContract<{ nested: { title: string } }>

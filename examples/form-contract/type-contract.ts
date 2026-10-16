import type { FormContract, FormErrors } from './contract'
import type { ExampleValues } from './values'

/** Compile-time examples of the proposed field/value boundary. */
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

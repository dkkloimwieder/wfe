export type { CreateFormControlInputProps as CreateFormControlFieldProps } from '@solid-primitives/a11y'
import { createFormControlInput } from '@solid-primitives/a11y'
import { isServer } from '@solidjs/web'
import { useFormControlContext } from './form-control-context.tsx'

export function createFormControlField(
  props?: Parameters<typeof createFormControlInput>[0],
) {
  const result = createFormControlInput(props)
  if (isServer) useFormControlContext().registerField(result.fieldProps.id())
  return result
}

export const FORM_CONTROL_FIELD_PROP_NAMES = [
  'id',
  'aria-label',
  'aria-labelledby',
  'aria-describedby',
] as const

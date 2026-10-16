import { createFormControl as _createFormControl } from '@solid-primitives/a11y'
import { isServer } from '@solidjs/web'

export type { CreateFormControlProps } from '@solid-primitives/a11y'

export const FORM_CONTROL_PROP_NAMES = [
  'id',
  'name',
  'validationState',
  'required',
  'disabled',
  'readOnly',
] as const

export function createFormControl(
  props: Parameters<typeof _createFormControl>[0],
): { formControlContext: ReturnType<typeof _createFormControl> } {
  const context = _createFormControl(props)
  if (!isServer) return { formControlContext: context }

  // SSR collects sibling IDs without signal setters. The primitive still formats ARIA.
  const ids: Record<
    'label' | 'field' | 'description' | 'error',
    string | undefined
  > = {
    label: undefined,
    field: undefined,
    description: undefined,
    error: undefined,
  }
  const register = (part: keyof typeof ids) => (id: string) => {
    ids[part] = id
    return () => {
      ids[part] = undefined
    }
  }
  return {
    formControlContext: {
      ...context,
      labelId: () => ids.label,
      fieldId: () => ids.field,
      descriptionId: () => ids.description,
      errorMessageId: () => ids.error,
      registerLabel: register('label'),
      registerField: register('field'),
      registerDescription: register('description'),
      registerErrorMessage: register('error'),
      getAriaLabelledBy(field, label, labelledBy) {
        const combined =
          [labelledBy, ids.label].filter(Boolean).join(' ') ||
          (labelledBy ?? ids.label)
        return context.getAriaLabelledBy(field, label, combined)
      },
      getAriaDescribedBy(describedBy) {
        const combined =
          [ids.description, ids.error, describedBy].filter(Boolean).join(' ') ||
          undefined
        return context.getAriaDescribedBy(combined)
      },
    },
  }
}

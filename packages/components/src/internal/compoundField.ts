import { createUniqueId, useContext } from 'solid-js'
import { FieldContext } from './fieldContext'

/** State aliases at the owned styled boundary. The primitive keeps its form owner. */
export type CompoundFieldProps = {
  readonly?: boolean
  invalid?: boolean
}
type StateProps = CompoundFieldProps & {
  disabled?: boolean
  required?: boolean
  readOnly?: boolean
  validationState?: 'valid' | 'invalid'
}
export function createCompoundField(props: StateProps) {
  const field = useContext(FieldContext)
  return {
    disabled: () => props.disabled ?? field?.disabled(),
    required: () => props.required ?? field?.required(),
    readonly: () => props.readonly ?? props.readOnly ?? field?.readonly(),
    validationState: () => {
      const invalid =
        props.invalid ??
        (props.validationState === undefined
          ? field?.invalid()
          : props.validationState === 'invalid')
      return invalid === undefined
        ? undefined
        : invalid
          ? ('invalid' as const)
          : ('valid' as const)
    },
  }
}
export function joinFieldIds(...values: Array<string | undefined>) {
  return (
    [
      ...new Set(
        values.flatMap((value) => value?.split(/\s+/).filter(Boolean) ?? []),
      ),
    ].join(' ') || undefined
  )
}
type TargetProps = {
  id?: string
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
}
/** Register the native target (or the labelled group), never a wrapper div. */
export function createCompoundFieldTarget(
  props: TargetProps,
  labelable = true,
): TargetProps {
  const field = useContext(FieldContext)
  // An absent key must stay absent so primitive-generated defaults remain stable.
  if (!field) return {}
  const generated = `field-target-${createUniqueId()}`
  const id = () => props.id ?? field.baseControlId() ?? generated
  field.registerControl(id, labelable)
  return {
    get id() {
      return id()
    },
    get 'aria-labelledby'() {
      return joinFieldIds(
        props['aria-labelledby'],
        props['aria-label'] === undefined ? field.labelledBy() : undefined,
      )
    },
    get 'aria-describedby'() {
      return joinFieldIds(props['aria-describedby'], field.describedBy())
    },
  }
}

/** Keep the single/multiple discriminant and its existing callback payload. */
export type WithValueChange<P> = P extends unknown
  ? P & {
      onValueChange?: P extends { onChange?: infer Callback } ? Callback : never
    }
  : never

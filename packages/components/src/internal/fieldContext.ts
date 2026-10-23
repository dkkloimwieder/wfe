import { createContext } from 'solid-js'

export type FieldState = {
  controlId: () => string
  baseControlId: () => string
  disabled: () => boolean | undefined
  readonly: () => boolean | undefined
  required: () => boolean | undefined
  invalid: () => boolean | undefined
  labelledBy: () => string | undefined
  labelable: () => boolean
  registerCompoundRoot: (resolve: () => unknown) => void
  registerLabel: (id: () => string) => void
  describedBy: () => string | undefined
  registerControl: (id: () => string, labelable?: boolean) => void
  registerDescription: (id: () => string, error: boolean) => void
}
export const FieldContext = createContext<FieldState | null>(null)

import { createContext } from 'solid-js'

export type FieldState = {
  controlId: () => string
  baseControlId: () => string
  disabled: () => boolean | undefined
  readonly: () => boolean | undefined
  required: () => boolean | undefined
  invalid: () => boolean | undefined
  describedBy: () => string | undefined
  registerControl: (id: () => string) => void
  registerDescription: (id: () => string, error: boolean) => void
}
export const FieldContext = createContext<FieldState | null>(null)

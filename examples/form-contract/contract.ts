/** Proposed contract. The reusable implementation belongs to wfe-w2y.3.2. */
export type FormScalar = string | number | boolean | null | undefined
export type FormValues = Record<string, FormScalar>
export type FormErrors<T> = Readonly<{
  fields?: Readonly<Partial<Record<keyof T, string>>>
  form?: string
}>
export type FormContext = Readonly<{ attempt: number; signal: AbortSignal }>
export type FormReply<T> = { ok: true } | { ok: false; errors: FormErrors<T> }
export type FormOutcome =
  | { status: 'success' | 'invalid' | 'rejected' | 'cancelled' | 'disposed' }
  | { status: 'error'; error: unknown }
export type FormPhase =
  | 'idle'
  | 'validating'
  | 'submitting'
  | 'success'
  | 'invalid'
  | 'rejected'
  | 'error'
export type MaybePromise<T> = T | PromiseLike<T>
export type FormBindings<T extends FormValues> = {
  values: () => Readonly<T>
  defaults: () => Readonly<T>
  onValuesChange: (requested: Readonly<T>) => void
  validate: (
    snapshot: Readonly<T>,
    context: FormContext,
  ) => MaybePromise<FormErrors<T>>
  onSubmit: (
    snapshot: Readonly<T>,
    context: FormContext,
  ) => MaybePromise<FormReply<T>>
}
export type FormContract<T extends FormValues> = {
  readonly values: Readonly<T>
  readonly errors: FormErrors<T>
  readonly failure: unknown
  readonly phase: FormPhase
  readonly pending: boolean
  readonly dirty: boolean
  setValue: <K extends keyof T>(field: K, value: T[K]) => void
  reset: () => void
  cancel: () => void
  submit: () => Promise<FormOutcome>
}

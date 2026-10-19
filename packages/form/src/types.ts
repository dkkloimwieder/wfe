export type FormScalar = string | number | boolean | null | undefined
/** One scalar value or one-level list of scalar records for each form key. */
export type FormShape<T extends object> = {
  [K in keyof T]:
    | FormScalar
    | (T[K] extends readonly (infer Row)[]
        ? readonly (Row extends object
            ? { [P in keyof Row]: FormScalar }
            : never)[]
        : never)
}
type SnapshotRows<Rows extends readonly object[]> = {
  readonly [K in keyof Rows]: Readonly<Rows[K]>
}
/** Immutable callback values, including arrays and each scalar row. */
export type FormSnapshot<T> = {
  readonly [K in keyof T]: T[K] extends readonly object[]
    ? SnapshotRows<T[K]>
    : T[K]
}
export type FormValues = Record<
  string,
  FormScalar | readonly Record<string, FormScalar>[]
>
export type FormRowErrors<Row> = Readonly<{
  fields?: Readonly<Partial<Record<keyof Row, string>>>
  row?: string
}>
type RepeatedKey<T> = {
  [K in keyof T]-?: T[K] extends readonly object[] ? K : never
}[keyof T]
type RowOf<V> = V extends readonly (infer Row)[] ? Row : never
export type FormRepeatedErrors<T> = [RepeatedKey<T>] extends [never]
  ? never
  : Readonly<{
      [K in RepeatedKey<T>]?: Readonly<
        Record<string, FormRowErrors<RowOf<T[K]>>>
      >
    }>
export type FormErrors<T> = Readonly<{
  fields?: Readonly<Partial<Record<keyof T, string>>>
  form?: string
  rows?: FormRepeatedErrors<T>
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
export type FormBindings<T extends object & FormShape<T>> = {
  values: () => Readonly<T>
  defaults: () => Readonly<T>
  onValuesChange: (requested: Readonly<T>) => void
  validate: (
    snapshot: FormSnapshot<T>,
    context: FormContext,
  ) => MaybePromise<FormErrors<T>>
  onSubmit: (
    snapshot: FormSnapshot<T>,
    context: FormContext,
  ) => MaybePromise<FormReply<T>>
}
export type FormContract<T extends object & FormShape<T>> = {
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

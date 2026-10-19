import type {
  FormErrors,
  FormRowErrors,
  FormScalar,
  FormSnapshot,
} from './types'

function isScalar(value: unknown): value is FormScalar {
  return (
    value == null ||
    ['string', 'number', 'boolean', 'undefined'].includes(typeof value)
  )
}
function scalarRecord(
  value: unknown,
): value is Record<PropertyKey, FormScalar> {
  return (
    typeof value === 'object' &&
    value !== null &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null) &&
    Reflect.ownKeys(value).every(
      (key) =>
        Object.prototype.propertyIsEnumerable.call(value, key) &&
        isScalar(Reflect.get(value, key)),
    )
  )
}
/** Never freeze application-owned rows or retain their mutable references. */
export function copyValues<T extends object>(values: Readonly<T>): Readonly<T> {
  const result = { ...values }
  for (const key of Reflect.ownKeys(result)) {
    const value: unknown = Reflect.get(result, key)
    if (isScalar(value)) continue
    if (!Array.isArray(value) || !Array.from(value).every(scalarRecord))
      throw new TypeError(
        'Form values require scalars or lists of scalar records',
      )
    Reflect.set(
      result,
      key,
      Object.freeze(value.map((row) => Object.freeze({ ...row }))),
    )
  }
  return Object.freeze(result)
}
export function copySnapshot<T extends object>(
  values: Readonly<T>,
): FormSnapshot<T> {
  return copyValues(values) as FormSnapshot<T>
}
function sameRecord(left: object, right: object) {
  const keys = Reflect.ownKeys(left)
  return (
    keys.length === Reflect.ownKeys(right).length &&
    keys.every(
      (key) =>
        Object.hasOwn(right, key) &&
        Object.is(Reflect.get(left, key), Reflect.get(right, key)),
    )
  )
}
function sameValue(left: unknown, right: unknown) {
  if (Object.is(left, right)) return true
  return (
    Array.isArray(left) &&
    Array.isArray(right) &&
    left.length === right.length &&
    Array.from(left).every(
      (row, index) =>
        scalarRecord(row) &&
        scalarRecord(right[index]) &&
        sameRecord(row, right[index]),
    )
  )
}
export function sameValues<T extends object>(
  left: Readonly<T>,
  right: Readonly<T>,
) {
  const keys = Reflect.ownKeys(left)
  return (
    keys.length === Reflect.ownKeys(right).length &&
    keys.every(
      (key) =>
        Object.hasOwn(right, key) &&
        sameValue(Reflect.get(left, key), Reflect.get(right, key)),
    )
  )
}
type RuntimeRows = Readonly<
  Record<string, Readonly<Record<string, FormRowErrors<object>>>>
>
function rowsOf<T>(errors: FormErrors<T>) {
  return errors.rows as RuntimeRows | undefined
}
export function hasErrors<T>(errors: FormErrors<T>) {
  return Boolean(
    errors.form ||
    Object.values(errors.fields ?? {}).some(Boolean) ||
    Object.values(rowsOf(errors) ?? {}).some((group) =>
      Object.values(group).some(
        (row) => row.row || Object.values(row.fields ?? {}).some(Boolean),
      ),
    ),
  )
}
export function copyErrors<T>(errors: FormErrors<T>): FormErrors<T> {
  const groups = rowsOf(errors)
  const rows =
    groups === undefined
      ? undefined
      : Object.freeze(
          Object.fromEntries(
            Object.entries(groups).map(([field, group]) => [
              field,
              Object.freeze(
                Object.fromEntries(
                  Object.entries(group).map(([key, row]) => [
                    key,
                    Object.freeze({
                      fields: Object.freeze({ ...row.fields }),
                      row: row.row,
                    }),
                  ]),
                ),
              ),
            ]),
          ),
        )
  return Object.freeze({
    fields: Object.freeze({ ...errors.fields }),
    form: errors.form,
    ...(rows === undefined ? {} : { rows }),
  }) as FormErrors<T>
}

/** Resolve each key lazily so changing translations does not replace controls. */
export function resolveMessages<T extends object>(
  defaults: Readonly<T>,
  overrides: () => Partial<T> | undefined,
): Readonly<T> {
  return new Proxy(defaults, {
    get(target, key: string | symbol) {
      const value = overrides()
      return (
        (value && Object.hasOwn(value, key)
          ? Reflect.get(value, key)
          : undefined) ?? Reflect.get(target, key)
      )
    },
  })
}

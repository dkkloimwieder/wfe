/** Resolve each key lazily so changing translations does not replace controls. */
export function resolveMessages<T extends object>(
  defaults: Readonly<T>,
  overrides: () => Partial<T> | undefined,
): Readonly<T> {
  function read(key: string | symbol) {
    const value = overrides()
    return (
      (value && Object.hasOwn(value, key)
        ? Reflect.get(value, key)
        : undefined) ?? Reflect.get(defaults, key)
    )
  }
  // Defaults can be frozen. A separate facade avoids proxying their immutable
  // property descriptors while preserving own keys for layered catalogs/spreads.
  const facade = Object.create(Object.getPrototypeOf(defaults)) as T
  return new Proxy(facade, {
    get: (_target, key) => read(key),
    has: (_target, key) => Reflect.has(defaults, key),
    ownKeys: () => Reflect.ownKeys(defaults),
    getOwnPropertyDescriptor: (_target, key) => {
      const descriptor = Reflect.getOwnPropertyDescriptor(defaults, key)
      return descriptor
        ? {
            configurable: true,
            enumerable: descriptor.enumerable,
            get: () => read(key),
          }
        : undefined
    },
  })
}

import { onCleanup, untrack } from 'solid-js'
import { callHandler } from './events'
import type { ComponentProps, JSX } from '@solidjs/web'

/** Keep the primitive's accepted selection authoritative for native form values. */
export function createHiddenSelectChange(
  props: Pick<ComponentProps<'select'>, 'onChange'>,
  selectedKeys: () => ReadonlySet<string>,
  locked: () => boolean,
) {
  let alive = true
  onCleanup(() => {
    alive = false
  })
  function restore(select: HTMLSelectElement) {
    const keys = selectedKeys()
    for (const option of select.options)
      option.selected = keys.has(option.value)
    if (!keys.size && !select.multiple) select.value = ''
  }
  return (
    event: Event & { currentTarget: HTMLSelectElement; target: Element },
  ) =>
    untrack(() => {
      callHandler(
        event,
        props.onChange as JSX.EventHandlerUnion<HTMLSelectElement, Event>,
      )
      // The primitive reads target.value after this callback. Restore first so
      // readonly autofill/change cannot mutate its uncontrolled state.
      if (locked()) restore(event.currentTarget)
      const select = event.currentTarget
      queueMicrotask(() => {
        if (alive && select.isConnected) untrack(() => restore(select))
      })
    })
}

/** Forward the existing manager, rejecting native writes while its control is locked. */
export function guardHiddenSelection<T extends object>(
  manager: T,
  locked: () => boolean,
): T {
  const methods = new Map<PropertyKey, { source: object; forwarded: unknown }>()
  return new Proxy(manager, {
    get(target, key) {
      const value: unknown = Reflect.get(target, key, target)
      if (typeof value !== 'function') return value
      const cached = methods.get(key)
      if (cached?.source === value) return cached.forwarded
      const forwarded = (...args: unknown[]): unknown => {
        if (key !== 'setSelectedKeys' || !locked())
          return Reflect.apply(value, target, args)
        return undefined
      }
      methods.set(key, { source: value, forwarded })
      return forwarded
    },
  })
}

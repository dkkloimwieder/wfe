import { createEffect } from 'solid-js'

export interface CommandShortcutOptions {
  onTrigger: (event: KeyboardEvent) => void
  enabled?: boolean
  key?: string
  allowInEditable?: boolean
  when?: (event: KeyboardEvent) => boolean
  document?: Document
}

type Registration = { options: CommandShortcutOptions }
const registries = new WeakMap<
  Document,
  { entries: Registration[]; listener: (event: KeyboardEvent) => void }
>()

/** Optional document shortcut. The most recently mounted eligible owner handles the event. */
export function createCommandShortcut(options: CommandShortcutOptions) {
  createEffect(
    () => ({
      enabled: options.enabled ?? true,
      document:
        options.document ??
        (typeof document === 'undefined' ? undefined : document),
    }),
    ({ enabled, document }) => {
      if (!enabled || !document) return
      let registry = registries.get(document)
      if (!registry) {
        const entries: Registration[] = []
        const listener = (event: KeyboardEvent) => {
          if (
            event.defaultPrevented ||
            event.isComposing ||
            event.keyCode === 229 ||
            event.repeat ||
            event.altKey ||
            event.shiftKey ||
            event.metaKey === event.ctrlKey
          )
            return
          for (const { options } of [...entries].reverse()) {
            if (event.key.toLowerCase() !== (options.key ?? 'k').toLowerCase())
              continue
            const target = event.composedPath()[0] as HTMLElement | undefined
            if (
              !options.allowInEditable &&
              (target?.isContentEditable ||
                target?.closest?.(
                  'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]',
                ))
            )
              continue
            if (options.when?.(event) === false) continue
            event.preventDefault()
            options.onTrigger(event)
            break
          }
        }
        registry = { entries, listener }
        registries.set(document, registry)
        document.addEventListener('keydown', listener)
      }
      const entry = { options }
      registry.entries.push(entry)
      return () => {
        const index = registry.entries.indexOf(entry)
        if (index !== -1) registry.entries.splice(index, 1)
        if (!registry.entries.length) {
          document.removeEventListener('keydown', registry.listener)
          registries.delete(document)
        }
      }
    },
  )
}

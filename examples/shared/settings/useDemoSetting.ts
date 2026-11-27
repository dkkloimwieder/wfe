import { createSignal, onSettled } from 'solid-js'
import type { Settings, SettingsKey } from './SettingsStore'
import { demoSettings } from './demoSettings'
import type { DemoRole } from './demoSettings'

export function useDemoSetting<
  K extends SettingsKey,
  Fallback extends Settings<DemoRole>[K] | undefined,
>(
  key: K,
  fallback: Fallback,
  onChange?: (value: Settings<DemoRole>[K] | Fallback) => void,
) {
  const [value, setValue] = createSignal<Settings<DemoRole>[K] | Fallback>(
    () => fallback,
  )
  const apply = (value: Settings<DemoRole>[K] | undefined) => {
    const next = value ?? fallback
    setValue(() => next)
    onChange?.(next)
  }
  onSettled(() => {
    const controller = new AbortController()
    let receivedChange = false
    const unsubscribe = demoSettings.subscribe(key, (next) => {
      receivedChange = true
      apply(next)
    })
    void demoSettings.get(key, { signal: controller.signal }).then(
      (initial) => {
        if (!controller.signal.aborted && !receivedChange) {
          apply(initial)
        }
      },
      () => {
        // The initial value stays usable when the local store is unavailable.
      },
    )
    return () => {
      controller.abort()
      unsubscribe()
    }
  })
  return value
}

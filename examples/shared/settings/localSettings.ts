import type {
  Settings,
  SettingsKey,
  SettingsListener,
  SettingsOptions,
  SettingsStore,
} from './SettingsStore'
import {
  assertWritableSettings,
  encodeSetting,
  parseSettingsJson,
} from './settingsRecord'
import type { SettingsDecoder, SettingsRecord } from './settingsRecord'

type LegacySetting = {
  record: SettingsRecord
  persistOnRead?: boolean
}

type StoredSetting = { record: unknown; persistOnRead?: boolean }

export function localSettings<Role extends string>(
  namespace: string,
  decode: SettingsDecoder<Role>,
  legacy?: (key: SettingsKey) => LegacySetting | undefined,
): SettingsStore<Role> {
  const changes = new EventTarget()
  const address = (key: SettingsKey) => `${namespace}.${key}`

  function withLock<T>(
    key: SettingsKey,
    options: SettingsOptions | undefined,
    operation: () => T,
  ) {
    const signal = options?.signal
    const run = () => {
      signal?.throwIfAborted()
      return operation()
    }
    const locks = globalThis.navigator?.locks
    // Without Web Locks, the synchronous update protects writes in this tab.
    return locks
      ? locks.request(address(key), { signal }, run)
      : Promise.resolve().then(run)
  }

  function readEntry(key: SettingsKey): StoredSetting {
    const raw = localStorage.getItem(address(key))
    return raw === null
      ? (legacy?.(key) ?? { record: undefined })
      : { record: parseSettingsJson(raw) }
  }

  function tryRead(key: SettingsKey) {
    try {
      return readEntry(key)
    } catch {
      return { record: undefined }
    }
  }

  function write(key: SettingsKey, record: SettingsRecord) {
    const serialized = JSON.stringify(record)
    const name = address(key)
    localStorage.setItem(name, serialized)
    changes.dispatchEvent(new CustomEvent(name, { detail: serialized }))
  }

  function load<K extends SettingsKey>(key: K) {
    const { record, persistOnRead } = tryRead(key)
    const value = decode(key, record)
    if (persistOnRead && value !== undefined) {
      try {
        write(key, encodeSetting(decode, key, value))
      } catch {
        // The legacy value is still usable if the browser refuses the migration.
      }
    }
    return value
  }

  function update<K extends SettingsKey>(
    key: K,
    change: (current: Settings<Role>[K] | undefined) => Settings<Role>[K],
    options?: SettingsOptions,
  ) {
    return withLock(key, options, () => {
      const { record } = readEntry(key)
      assertWritableSettings(record)
      const next = change(decode(key, record))
      options?.signal?.throwIfAborted()
      write(key, encodeSetting(decode, key, next))
    })
  }

  return {
    async get(key, options) {
      options?.signal?.throwIfAborted()
      const { record, persistOnRead } = tryRead(key)
      return persistOnRead
        ? withLock(key, options, () => load(key))
        : decode(key, record)
    },
    set(key, value, options) {
      return update(key, () => value, options)
    },
    update,
    subscribe<K extends SettingsKey>(
      key: K,
      listener: SettingsListener<Settings<Role>[K]>,
    ) {
      const name = address(key)
      const changed = (event: Event) => {
        const serialized = (event as CustomEvent<string>).detail
        listener(decode(key, parseSettingsJson(serialized)))
      }
      const storageChanged = (event: StorageEvent) => {
        if (
          event.storageArea === localStorage &&
          (event.key === name || event.key === null)
        ) {
          listener(decode(key, tryRead(key).record))
        }
      }
      changes.addEventListener(name, changed)
      window.addEventListener('storage', storageChanged)
      return () => {
        changes.removeEventListener(name, changed)
        window.removeEventListener('storage', storageChanged)
      }
    },
  }
}

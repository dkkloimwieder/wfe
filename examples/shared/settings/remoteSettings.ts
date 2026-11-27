import type {
  Settings,
  SettingsKey,
  SettingsListener,
  SettingsOptions,
  SettingsStore,
} from './SettingsStore'
import { assertWritableSettings, encodeSetting } from './settingsRecord'
import type { SettingsDecoder, SettingsRecord } from './settingsRecord'

export type RemoteRecord = {
  revision: number
  envelope: unknown
}

// The application binds the transport to the authenticated user and tenant.
export interface RemoteSettingsTransport {
  read(key: SettingsKey, signal?: AbortSignal): Promise<RemoteRecord>
  write(
    key: SettingsKey,
    envelope: SettingsRecord,
    expectedRevision: number,
    signal?: AbortSignal,
  ): Promise<'written' | 'conflict'>
  subscribe(
    key: SettingsKey,
    listener: (record: RemoteRecord) => void,
  ): () => void
}

export function remoteSettings<Role extends string>(
  transport: RemoteSettingsTransport,
  decode: SettingsDecoder<Role>,
): SettingsStore<Role> {
  async function read(key: SettingsKey, signal?: AbortSignal) {
    signal?.throwIfAborted()
    const record = await transport.read(key, signal)
    signal?.throwIfAborted()
    return record
  }

  async function update<K extends SettingsKey>(
    key: K,
    change: (current: Settings<Role>[K] | undefined) => Settings<Role>[K],
    options?: SettingsOptions,
  ) {
    const signal = options?.signal
    for (let attempt = 0; attempt < 3; attempt++) {
      const { envelope, revision } = await read(key, signal)
      assertWritableSettings(envelope)
      const next = encodeSetting(decode, key, change(decode(key, envelope)))
      signal?.throwIfAborted()
      if ((await transport.write(key, next, revision, signal)) === 'written')
        return
    }
    throw new Error('The setting changed while you edited it.')
  }

  return {
    async get(key, options) {
      return decode(key, (await read(key, options?.signal)).envelope)
    },
    set(key, value, options) {
      return update(key, () => value, options)
    },
    update,
    subscribe<K extends SettingsKey>(
      key: K,
      listener: SettingsListener<Settings<Role>[K]>,
    ) {
      let revision = -1
      return transport.subscribe(key, (record) => {
        if (record.revision <= revision) return
        revision = record.revision
        listener(decode(key, record.envelope))
      })
    },
  }
}

import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TableView } from '@wfe/components/table'
import { demoSettings } from '../../examples/shared/settings/demoSettings'
import { localSettings } from '../../examples/shared/settings/localSettings'
import {
  remoteSettings,
  type RemoteRecord,
  type RemoteSettingsTransport,
} from '../../examples/shared/settings/remoteSettings'
import { settingsDecoder } from '../../examples/shared/settings/settingsRecord'
import { userTableViewKey } from '../../examples/shared/settings/userTableViews'

const roles = ['Member', 'Customer'] as const
const decode = settingsDecoder(roles)
const namespace = 'settings-test'
const key = 'tableViews:inventory' as const
const view: TableView = { id: 'stock', name: 'Stock', state: { version: 1 } }
const demoKey = (id: string) => `wfe.settings.demo.anonymous.${id}`
const sessionKey = 'wfe-gallery-user-table-views'

afterEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

describe('local settings', () => {
  it('round-trips typed values and combines concurrent table updates', async () => {
    const store = localSettings(namespace, decode)
    await store.set('theme', 'laser')
    await store.set('scheme', 'system')
    await store.set('role', 'Customer')
    await Promise.all([
      store.update(key, (current) => ({
        views: [...(current?.views ?? []), view],
      })),
      store.update(key, (current) => ({
        views: [...(current?.views ?? []), { ...view, id: 'cost' }],
        defaultId: 'stock',
      })),
    ])
    const reopened = localSettings(namespace, decode)
    expect(await reopened.get('theme')).toBe('laser')
    expect(await reopened.get('scheme')).toBe('system')
    expect(await reopened.get('role')).toBe('Customer')
    expect(await reopened.get(key)).toMatchObject({
      views: [view, { ...view, id: 'cost' }],
      defaultId: 'stock',
    })
    expect(JSON.parse(localStorage.getItem(`${namespace}.theme`)!)).toEqual({
      version: 1,
      value: 'laser',
    })
  })

  it('stores account preferences separately from the sidebar role', async () => {
    const store = localSettings(namespace, decode)
    const profile = {
      name: 'Jordan Reyes',
      email: 'jordan@example.com',
      language: 'English',
      timeZone: 'UTC',
    }
    await store.set('profile', profile)
    await store.set('notificationChannels', { 'Support:Email': true })
    await store.update('notificationChannels', (current) => ({
      ...current,
      'Tasks:In-app': false,
    }))
    await store.set('density', 'compact')
    await store.set('signInDefaults', {
      landing: 'My tickets',
      role: 'Customer',
    })
    await store.set('role', 'Member')

    const reopened = localSettings(namespace, decode)
    expect(await reopened.get('profile')).toEqual(profile)
    expect(await reopened.get('notificationChannels')).toEqual({
      'Support:Email': true,
      'Tasks:In-app': false,
    })
    expect(await reopened.get('density')).toBe('compact')
    expect(await reopened.get('signInDefaults')).toEqual({
      landing: 'My tickets',
      role: 'Customer',
    })
    expect(await reopened.get('role')).toBe('Member')
  })

  it('rejects invalid account settings in older browser storage', async () => {
    const store = localSettings(namespace, decode)
    const invalid = {
      density: 'compressed',
      profile: { name: 'Jordan Reyes', email: 12 },
      notificationChannels: { 'Tasks:In-app': 'false' },
      signInDefaults: { landing: 'Unknown page', role: 'Customer' },
    }
    for (const [setting, value] of Object.entries(invalid)) {
      localStorage.setItem(
        `${namespace}.${setting}`,
        JSON.stringify({ version: 1, value }),
      )
    }
    expect(await store.get('density')).toBeUndefined()
    expect(await store.get('profile')).toBeUndefined()
    expect(await store.get('notificationChannels')).toBeUndefined()
    expect(await store.get('signInDefaults')).toBeUndefined()
  })

  it('rejects invalid settings and skips invalid or repeated views', async () => {
    const store = localSettings(namespace, decode)
    localStorage.setItem(`${namespace}.theme`, 'invalid JSON')
    localStorage.setItem(
      `${namespace}.scheme`,
      JSON.stringify({ version: 1, value: 'auto' }),
    )
    localStorage.setItem(
      `${namespace}.role`,
      JSON.stringify({ version: 1, value: 'Owner' }),
    )
    localStorage.setItem(
      `${namespace}.${key}`,
      JSON.stringify({ version: 1, value: { views: null } }),
    )
    expect(await store.get('theme')).toBeUndefined()
    expect(await store.get('scheme')).toBeUndefined()
    expect(await store.get('role')).toBeUndefined()
    expect(await store.get(key)).toBeUndefined()

    const views = {
      views: [
        view,
        null,
        { ...view, name: 'Duplicate' },
        { ...view, id: 'newer', state: { version: 2 } },
      ],
      defaultId: 'system-view',
    }
    localStorage.setItem(
      `${namespace}.${key}`,
      JSON.stringify({ version: 1, value: views }),
    )
    expect(await store.get(key)).toMatchObject({
      views: [view],
      defaultId: 'system-view',
    })
  })

  it('preserves future versions and avoids writes after cancellation', async () => {
    const store = localSettings(namespace, decode)
    const raw = JSON.stringify({ version: 2, value: 'laser' })
    localStorage.setItem(`${namespace}.theme`, raw)
    const change = vi.fn(() => 'default' as const)
    await expect(store.update('theme', change)).rejects.toThrow(
      'Unsupported settings version',
    )
    expect(change).not.toHaveBeenCalled()
    expect(await store.get('theme')).toBeUndefined()
    expect(localStorage.getItem(`${namespace}.theme`)).toBe(raw)

    await expect(
      store.set('scheme', 'dark', { signal: AbortSignal.abort() }),
    ).rejects.toThrow()
    expect(await store.get('scheme')).toBeUndefined()
  })

  it('notifies this tab, accepts other-tab events and cleans up subscriptions', async () => {
    const store = localSettings(namespace, decode)
    const listener = vi.fn()
    const unsubscribe = store.subscribe('scheme', listener)
    await store.set('scheme', 'light')
    expect(listener).toHaveBeenCalledExactlyOnceWith('light')

    const address = `${namespace}.scheme`
    const raw = JSON.stringify({ version: 1, value: 'dark' })
    localStorage.setItem(address, raw)
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: address,
        storageArea: localStorage,
        newValue: raw,
      }),
    )
    expect(listener).toHaveBeenLastCalledWith('dark')
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: address,
        storageArea: sessionStorage,
      }),
    )
    expect(listener).toHaveBeenCalledTimes(2)

    localStorage.clear()
    window.dispatchEvent(
      new StorageEvent('storage', { key: null, storageArea: localStorage }),
    )
    expect(listener).toHaveBeenLastCalledWith(undefined)
    unsubscribe()
    await store.set('scheme', 'system')
    expect(listener).toHaveBeenCalledTimes(3)
  })
})

describe('gallery view migrations', () => {
  it('reads old local lists until the first write and keeps the original key', async () => {
    const legacy = JSON.stringify({ views: [view], defaultId: 'stock' })
    localStorage.setItem('wfe.gallery.table-views.inventory', legacy)
    expect(await demoSettings.get(key)).toMatchObject({
      views: [view],
      defaultId: 'stock',
    })
    expect(localStorage.getItem(demoKey(key))).toBeNull()

    await demoSettings.update(key, (current) => ({
      views: current?.views ?? [],
      defaultId: null,
    }))
    expect(await demoSettings.get(key)).toMatchObject({
      views: [view],
      defaultId: null,
    })
    expect(localStorage.getItem('wfe.gallery.table-views.inventory')).toBe(
      legacy,
    )
  })

  it('keeps edited and deleted session views and promotes their default IDs', async () => {
    const edited = { ...view, id: 'by-priority', name: 'My priority order' }
    sessionStorage.setItem(
      sessionKey,
      JSON.stringify({
        version: 1,
        'My tickets': { views: [edited, null], defaultId: edited.id },
        Notifications: { views: [], defaultId: null },
      }),
    )
    const tickets = userTableViewKey('My tickets')
    const notifications = userTableViewKey('Notifications')
    expect(await demoSettings.get(tickets)).toMatchObject({
      views: [edited],
      defaultId: edited.id,
    })
    expect(await demoSettings.get(notifications)).toEqual({
      views: [],
      defaultId: null,
    })
    expect(localStorage.getItem(demoKey(tickets))).toBeTruthy()
    sessionStorage.clear()
    expect(await demoSettings.get(tickets)).toMatchObject({
      views: [edited],
      defaultId: edited.id,
    })
    expect(await demoSettings.get(notifications)).toEqual({
      views: [],
      defaultId: null,
    })
  })

  it('adds new examples to a versionless list without restoring deleted original seeds', async () => {
    const edited = { ...view, id: 'recently-updated', name: 'Edited' }
    sessionStorage.setItem(
      sessionKey,
      JSON.stringify({
        'My tickets': { views: [edited], defaultId: edited.id },
      }),
    )
    const list = await demoSettings.get(userTableViewKey('My tickets'))
    expect(list?.views.map(({ id, name }) => [id, name])).toEqual([
      [edited.id, edited.name],
      ['open-tickets', 'Open tickets'],
      ['by-application', 'By application'],
    ])
    expect(list?.defaultId).toBe(edited.id)
  })
})

describe('remote settings', () => {
  it('retries a revision conflict against the latest record', async () => {
    const concurrentView = { ...view, id: 'concurrent' }
    const read = vi
      .fn<RemoteSettingsTransport['read']>()
      .mockResolvedValueOnce({
        revision: 5,
        envelope: { version: 1, value: { views: [] } },
      })
      .mockResolvedValueOnce({
        revision: 6,
        envelope: { version: 1, value: { views: [concurrentView] } },
      })
    const write = vi
      .fn<RemoteSettingsTransport['write']>()
      .mockResolvedValueOnce('conflict')
      .mockResolvedValueOnce('written')
    const store = remoteSettings(
      { read, write, subscribe: () => () => {} },
      decode,
    )

    await store.update(key, (current) => ({
      views: [...(current?.views ?? []), view],
    }))
    expect(write).toHaveBeenNthCalledWith(
      1,
      key,
      { version: 1, value: { views: [expect.objectContaining(view)] } },
      5,
      undefined,
    )
    expect(write).toHaveBeenNthCalledWith(
      2,
      key,
      {
        version: 1,
        value: {
          views: [
            expect.objectContaining(concurrentView),
            expect.objectContaining(view),
          ],
        },
      },
      6,
      undefined,
    )
  })

  it('bounds retries, propagates transport errors and ignores old event revisions', async () => {
    let deliver: ((record: RemoteRecord) => void) | undefined
    const cancel = vi.fn()
    const read = vi
      .fn<RemoteSettingsTransport['read']>()
      .mockResolvedValue({ revision: 5, envelope: undefined })
    const write = vi
      .fn<RemoteSettingsTransport['write']>()
      .mockResolvedValue('conflict')
    const store = remoteSettings(
      {
        read,
        write,
        subscribe(_key, listener) {
          deliver = listener
          return cancel
        },
      },
      decode,
    )
    await expect(store.set('role', 'Member')).rejects.toThrow(
      'The setting changed while you edited it.',
    )
    expect(write).toHaveBeenCalledTimes(3)

    read.mockRejectedValueOnce(new Error('Connection lost'))
    await expect(store.get('scheme')).rejects.toThrow('Connection lost')
    const listener = vi.fn()
    const unsubscribe = store.subscribe('role', listener)
    deliver?.({ revision: 6, envelope: { version: 1, value: 'Customer' } })
    deliver?.({ revision: 5, envelope: { version: 1, value: 'Member' } })
    expect(listener).toHaveBeenCalledExactlyOnceWith('Customer')
    unsubscribe()
    expect(cancel).toHaveBeenCalledOnce()
  })
})

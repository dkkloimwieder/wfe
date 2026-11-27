import { createEffect, createMemo, createSignal, untrack } from 'solid-js'
import {
  copyTableViewValue,
  mergeTableViewState,
  readTableView,
  viewRecord,
  type TableView,
  type TableViewList,
  type TableViewState,
  type TableViewsOptions,
} from './tableViewState'

export function createTableViews(options: {
  configuration: () => TableViewsOptions | undefined
  capture: () => TableViewState | undefined
  normalize: (state: TableViewState, initial: TableViewState) => TableViewState
  restore: (state: TableViewState) => void
}) {
  const [initial, setInitial] = createSignal<TableViewState>()
  const [users, setUsers] = createSignal<readonly TableView[]>([])
  const [selectedId, setSelectedId] = createSignal('')
  const [defaultId, setDefaultId] = createSignal<string>()
  const [busy, setBusy] = createSignal(false)
  const [ready, setReady] = createSignal(false)
  const [error, setError] = createSignal<'list' | 'write' | 'state' | 'name'>()
  let pending: AbortController | undefined
  let queuedList: TableViewList | undefined
  const system = createMemo(() => {
    const ids = new Map<string, TableView>()
    for (const input of options.configuration()?.systemViews ?? []) {
      const view = readTableView(input)
      if (view && !ids.has(view.id)) ids.set(view.id, view)
    }
    return ids
  })
  const views = createMemo(() => [
    ...system().values(),
    ...users().filter((view) => !system().has(view.id)),
  ])
  const selected = createMemo(() =>
    views().find((view) => view.id === selectedId()),
  )
  const locked = () => Boolean(selected() && system().has(selectedId()))
  const capture = createMemo(() =>
    options.configuration() ? options.capture() : undefined,
  )
  function normalize(state: TableViewState, baseline: TableViewState) {
    return options.normalize(mergeTableViewState(baseline, state), baseline)
  }
  const current = createMemo(() => {
    const state = capture()
    const baseline = initial()
    return state && baseline ? normalize(state, baseline) : state
  })
  const dirty = createMemo(() => {
    const view = selected()
    const baseline = initial()
    if (!view || !baseline) return false
    return (
      fingerprint(current()) !== fingerprint(normalize(view.state, baseline))
    )
  })
  function fingerprint(state: TableViewState | undefined) {
    return JSON.stringify(copyTableViewValue(state))
  }
  function apply(view: TableView) {
    const baseline = initial()
    if (!baseline) return
    const state = normalize(view.state, baseline)
    if (fingerprint(current()) !== fingerprint(state)) options.restore(state)
    setSelectedId(view.id)
  }
  function choose(id: string) {
    if (pending) return
    if (error() !== 'list') setError()
    if (!id) {
      setSelectedId('')
      return
    }
    const view = views().find((item) => item.id === id)
    if (view) apply(view)
  }

  async function request(
    kind: 'list' | 'write',
    work: (signal: AbortSignal) => Promise<() => void>,
  ) {
    if (pending) return false
    const controller = new AbortController()
    pending = controller
    setBusy(true)
    setError()
    try {
      const finish = await work(controller.signal)
      if (controller.signal.aborted) return false
      finish()
      return true
    } catch {
      if (!controller.signal.aborted) setError(kind)
      return false
    } finally {
      if (pending === controller) {
        pending = undefined
        setBusy(false)
        syncList()
      }
    }
  }

  function load() {
    // Snapshot the adapter and current controls for this load request.
    const { configuration, baseline, before } = untrack(() => ({
      configuration: options.configuration(),
      baseline: initial() ?? capture() ?? { version: 1 as const },
      before: fingerprint(capture()),
    }))
    if (!configuration) return Promise.resolve(false)
    setInitial(baseline)
    return request('list', async (signal) => {
      const entries = parseList(await configuration.storage.list(signal))
      return () => {
        const { resolve, preferred } = publishList(entries)
        const view = preferred ?? resolve(configuration.initialViewId)
        if (view) {
          // A slow list request must not overwrite controls changed during loading.
          if (fingerprint(capture()) === before) apply(view)
          else setSelectedId(view.id)
        }
        setReady(true)
      }
    })
  }

  function parseList(input: TableViewList) {
    const result = viewRecord(input)
    if (!Array.isArray(result?.views))
      throw new Error('Invalid saved view list')
    const entries = new Map<string, TableView>()
    for (const input of result.views as unknown[]) {
      const view = readTableView(input)
      if (view && !entries.has(view.id)) entries.set(view.id, view)
    }
    const storedDefault =
      typeof result.defaultId === 'string' ? result.defaultId : undefined
    return { entries, storedDefault }
  }

  function publishList({
    entries,
    storedDefault,
  }: ReturnType<typeof parseList>) {
    setUsers([...entries.values()])
    const resolve = (id: string | undefined) =>
      id ? (system().get(id) ?? entries.get(id)) : undefined
    const preferred = resolve(storedDefault)
    setDefaultId(preferred?.id)
    return { resolve, preferred }
  }

  function syncList() {
    if (pending || !queuedList) return
    const list = queuedList
    queuedList = undefined
    let entries: ReturnType<typeof parseList>
    try {
      entries = parseList(list)
    } catch {
      setError('list')
      return
    }
    const { resolve } = publishList(entries)
    if (selectedId() && !resolve(selectedId())) setSelectedId('')
  }

  createEffect(
    () => options.configuration()?.storage,
    (storage) => {
      setUsers([])
      setSelectedId('')
      setDefaultId()
      setReady(false)
      if (!storage) return
      void load()
      const unsubscribe = storage.subscribe?.((list) => {
        queuedList = list
        syncList()
      })
      return () => {
        unsubscribe?.()
        pending?.abort()
        pending = undefined
        queuedList = undefined
        setBusy(false)
      }
    },
  )

  function save(name: string, mode: 'copy' | 'save' | 'rename') {
    const configuration = options.configuration()
    if (!configuration || !ready() || pending) return Promise.resolve(false)
    const existing = mode === 'copy' ? undefined : selected()
    if (mode !== 'copy' && (!existing || locked()))
      return Promise.resolve(false)
    const title = name.trim()
    if (
      !title ||
      title.length > 80 ||
      views().some(
        (item) =>
          item.id !== existing?.id &&
          item.name.toLowerCase() === title.toLowerCase(),
      )
    ) {
      setError('name')
      return Promise.resolve(false)
    }
    const state = mode === 'rename' ? existing?.state : current()
    if (!state || copyTableViewValue(state) === undefined) {
      setError('state')
      return Promise.resolve(false)
    }
    const view = {
      id:
        existing?.id ??
        globalThis.crypto.getRandomValues(new Uint32Array(4)).join('-'),
      name: title,
      state,
    }
    return request('write', async (signal) => {
      await configuration.storage.save(structuredClone(view), signal)
      return () => {
        setUsers((previous) =>
          existing
            ? previous.map((item) => (item.id === view.id ? view : item))
            : [...previous, view],
        )
        setSelectedId(view.id)
      }
    })
  }

  function remove() {
    const configuration = options.configuration()
    const view = selected()
    if (!configuration || !ready() || !view || locked())
      return Promise.resolve(false)
    return request('write', async (signal) => {
      await configuration.storage.remove(view.id, signal)
      return () => {
        setUsers((previous) => previous.filter((item) => item.id !== view.id))
        if (defaultId() === view.id) setDefaultId()
        setSelectedId('')
      }
    })
  }

  function changeDefault() {
    const configuration = options.configuration()
    const id = selected()?.id
    if (!configuration || !ready() || !id) return Promise.resolve(false)
    const next = defaultId() === id ? null : id
    return request('write', async (signal) => {
      await configuration.storage.setDefault(next, signal)
      return () => setDefaultId(next ?? undefined)
    })
  }

  return {
    views,
    selected,
    defaultId,
    busy,
    ready,
    error,
    locked,
    dirty,
    choose,
    save,
    remove,
    changeDefault,
    reload: load,
    clearError: () => setError(),
  }
}

export type TableViewsController = ReturnType<typeof createTableViews>

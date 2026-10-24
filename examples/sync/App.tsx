import {
  For,
  Loading,
  Show,
  createMemo,
  createSignal,
  onCleanup,
  untrack,
} from 'solid-js'
import { Button } from '@wfe/components'
import { collection, liveList, liveRows, syncStatus } from '@wfe/sync'
import { applyChanges } from '@wfe/sync/internal'
import { DefaultAppearance } from '../shared/appearance/DefaultAppearance'
import { fakeFeed, makeRows, randomChanges } from './fake'
import type { Order, Scope } from './fake'
import './style.css'

type Store = ReturnType<typeof collection<Order, Scope>>
const sizes = [10_000, 100_000]
const limit = 200

export function App() {
  const [size, setSize] = createSignal(sizes[0]!)
  const [applied, setApplied] = createSignal(0)
  const store = createMemo(() => {
    const rows = makeRows(size())
    const c = collection(
      fakeFeed(() => rows),
      { size: size() },
      {
        key: `orders:${size()}`,
      },
    )
    onCleanup(() => queueMicrotask(() => void c.cleanup()))
    return c
  })
  const apply = () => {
    const c = store()
    applyChanges(c, randomChanges(c.toArray))
    setApplied((count) => count + 1)
  }
  return (
    <DefaultAppearance class="sync-example">
      <header class="sync-controls">
        <h1 class="sync-title" data-ui-text="system">
          Sync store
        </h1>
        <div class="sync-buttons" role="group" aria-label="Row count">
          <For each={sizes}>
            {(count) => (
              <Button
                variant={size() === count ? 'filled' : 'outline'}
                aria-pressed={size() === count ? 'true' : 'false'}
                onClick={() => {
                  setSize(count)
                  setApplied(0)
                }}
              >
                {count.toLocaleString('en-US')} rows
              </Button>
            )}
          </For>
          <Button onClick={apply}>Apply 100 changes</Button>
          <span data-sync-applied={applied()}>{applied()} batches applied</span>
        </div>
      </header>
      <Show when={store()} keyed>
        {(c) => <Shapes store={c} />}
      </Show>
    </DefaultAppearance>
  )
}

function Shapes(props: { store: Store }) {
  const rows = liveRows(props.store)
  const list = liveList(props.store)
  const status = syncStatus(props.store)
  const ids = createMemo(() => Object.keys(rows))
  const shownIds = createMemo(() => ids().slice(0, limit))
  // Every batch inserts and deletes rows, so the key list changes. Count the
  // updated rows untracked to keep this memo on one source.
  const updated = createMemo(() => {
    const keys = ids()
    return untrack(() => keys.filter((id) => rows[id]!.row_version > 1).length)
  })
  const shown = createMemo(() => list.slice(0, limit))
  return (
    <main class="sync-shapes">
      <p class="sync-status">
        Status: <output data-sync-status={status()}>{status()}</output>
      </p>
      <section class="sync-shape" aria-labelledby="sync-rows-title">
        <h2 id="sync-rows-title" data-ui-text="system">
          liveRows
        </h2>
        <p>
          <span data-sync-rows={ids().length} data-sync-updated={updated()}>
            {ids().length.toLocaleString('en-US')}
          </span>{' '}
          rows in a plain table, first {limit} shown
        </p>
        <div class="sync-scroll">
          <table class="sync-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Quantity</th>
                <th>Status</th>
                <th>Version</th>
              </tr>
            </thead>
            <tbody>
              <For each={shownIds()}>
                {(id) => (
                  <tr>
                    <td>{rows[id]?.name}</td>
                    <td>{rows[id]?.quantity}</td>
                    <td>{rows[id]?.status}</td>
                    <td>{rows[id]?.row_version}</td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </section>
      <section class="sync-shape" aria-labelledby="sync-list-title">
        <h2 id="sync-list-title" data-ui-text="system">
          liveList
        </h2>
        <Loading fallback={<p>Loading the first page</p>}>
          <p>
            <span data-sync-list={list.length}>
              {list.length.toLocaleString('en-US')}
            </span>{' '}
            rows, first {limit} shown
          </p>
          <div class="sync-scroll">
            <ol class="sync-list">
              <For each={shown()}>
                {(row) => (
                  <li>
                    {row.name} · {row.quantity} · {row.status} · v
                    {row.row_version}
                  </li>
                )}
              </For>
            </ol>
          </div>
        </Loading>
      </section>
    </main>
  )
}

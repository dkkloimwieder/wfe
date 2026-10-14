import { createSignal, onCleanup } from 'solid-js'
import { createTable as createNativeTable } from '@wfe/components/table'

export const lifecycle = {
  reads: 0,
  cleanups: 0,
  rename: (_value: string) => {},
}

export default function App() {
  const [name, setName] = createSignal('Ada')
  lifecycle.rename = setName
  onCleanup(() => lifecycle.cleanups++)
  const record = {
    get name() {
      lifecycle.reads++
      return name()
    },
  }
  const table = createNativeTable({
    source: { ids: () => ['a'], get: () => record },
    columns: [{ id: 'name', accessorKey: 'name' }],
  })
  const cell = table.createRowView('a').getVisibleCells()[0]!
  return (
    <>
      <table>
        <tbody>
          <tr>
            <td id="name">{cell.getValue()}</td>
          </tr>
        </tbody>
      </table>
      <button id="rename" onClick={() => setName('Grace')}>
        Rename
      </button>
    </>
  )
}

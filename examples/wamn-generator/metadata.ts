import definition from '../wamn/.input/definition.json'
import {
  WidgetQueryTableLabel,
  WidgetUpdateFormLabel,
} from '../wamn/.input/components/labels'
import type { Metadata } from './projection'
export function metadata(name: string): Metadata {
  if (name !== 'original' && name !== 'review')
    throw new Error(`WAMN adapter: unsupported metadata variant ${name}`)
  const original: Metadata = {
    operation: definition.operation,
    rowId: definition.rowId,
    columns: definition.columns,
    fields: ['code', 'note'].map((id) => {
      const column = definition.columns.find((column) => column.id === id)
      if (!column) throw new Error(`WAMN adapter: missing editor column ${id}`)
      return { id, label: column.label }
    }),
    choices: [
      { value: 'priority', label: 'Priority' },
      { value: 'standard', label: 'Standard' },
    ],
    title: WidgetQueryTableLabel,
    formTitle: WidgetUpdateFormLabel,
    refreshLabel: 'Refresh widgets',
    reversePanels: false,
  }
  return name === 'original'
    ? original
    : {
        ...original,
        title: 'Review widgets',
        formTitle: 'Review widget',
        refreshLabel: 'Reload widgets',
        reversePanels: true,
        fields: [
          { id: 'note', label: 'Service note' },
          { id: 'code', label: 'Handling class' },
        ],
        columns: [...original.columns].reverse().map((column) => ({
          ...column,
          label: column.id === 'note' ? 'Service note' : column.label,
        })),
        choices: [...original.choices].reverse(),
      }
}

export type GridRowDescription = Readonly<{
  id: string
  label: string
  disabled?: boolean
}>
export type GridColumnDescription = Readonly<{
  id: string
  label: string
  readOnly?: boolean
}>
export type GridDescription = Readonly<{
  id: string
  title?: string
  rows: readonly GridRowDescription[]
  columns: readonly GridColumnDescription[]
}>
export type GridRowId<D extends GridDescription> = D['rows'][number]['id']
export type GridColumnId<D extends GridDescription> = D['columns'][number]['id']
export type GridCellChange<D extends GridDescription = GridDescription> =
  Readonly<{
    row: GridRowId<D>
    column: GridColumnId<D>
    value: boolean
  }>
export type GridBindings<D extends GridDescription = GridDescription> =
  Readonly<{
    value: (row: GridRowId<D>, column: GridColumnId<D>) => boolean
    onValueChange: (requested: GridCellChange<D>) => void
  }>
export type GridViewProps<D extends GridDescription = GridDescription> =
  Readonly<{
    description: D
    bindings: GridBindings<D>
  }>

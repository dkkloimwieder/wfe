/** Use text and scalar headers as labels. Rich headers need a separate label. */
export function columnLabel(column: {
  id: string
  columnDef?: { header?: unknown }
}): string {
  const header = column.columnDef?.header
  switch (typeof header) {
    case 'string':
      return header
    case 'number':
    case 'boolean':
    case 'bigint':
    case 'symbol':
      return String(header)
    default:
      return column.id
  }
}

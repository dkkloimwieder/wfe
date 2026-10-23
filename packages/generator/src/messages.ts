import { resolveMessages } from '@wfe/components'

/** UI text only. Metadata labels and application errors remain application values. */
export interface GeneratorMessages {
  loading: string
  formActionFailed: string
  delete: string
  cancel: string
  addRow: string
  removeRow: string
  removeRowLabel: (label: string, row: number) => string
  repeatedRowTitle: (label: string, row: number) => string
  rowHeader: string
  navigationLabel: string
  toggleLabel: string
  closeLabel: string
  contextLabel: string
  contextToggleLabel: string
  contextCloseLabel: string
}
export const generatorMessages: Readonly<GeneratorMessages> = {
  loading: 'Loading',
  formActionFailed: 'The form action failed.',
  delete: 'Delete',
  cancel: 'Cancel',
  addRow: 'Add row',
  removeRow: 'Remove row',
  removeRowLabel: (label, row) => `Remove ${label} row ${row}`,
  repeatedRowTitle: (label, row) => `${label} ${row}`,
  rowHeader: 'Row',
  navigationLabel: 'Primary navigation',
  toggleLabel: 'Navigation',
  closeLabel: 'Close navigation',
  contextLabel: 'Context navigation',
  contextToggleLabel: 'Context',
  contextCloseLabel: 'Close context',
}
export type GeneratorMessageProps = { messages?: Partial<GeneratorMessages> }
export const resolveGeneratorMessages = (
  overrides: () => Partial<GeneratorMessages> | undefined,
) => resolveMessages(generatorMessages, overrides)

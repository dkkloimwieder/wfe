import { resolveMessages } from '@wfe/components'

export interface ShellMessages {
  audience: string
  breadcrumbs: string
  navigationLabel: string
  toggleLabel: string
  closeLabel: string
  contextLabel: string
  contextToggleLabel: string
  contextCloseLabel: string
}
export const shellMessages: Readonly<ShellMessages> = {
  audience: 'Audience',
  breadcrumbs: 'Breadcrumbs',
  navigationLabel: 'Primary navigation',
  toggleLabel: 'Navigation',
  closeLabel: 'Close navigation',
  contextLabel: 'Context navigation',
  contextToggleLabel: 'Context',
  contextCloseLabel: 'Close context',
}
export const resolveShellMessages = (
  overrides: () => Partial<ShellMessages> | undefined,
) => resolveMessages(shellMessages, overrides)

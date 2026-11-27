import type { Tenant } from './blocksData'

export type UserPageProps = {
  contentOnly?: boolean
  visible?: boolean
  tenant?: Tenant
}

export const userPageIds = {
  home: 'blocks-user-home',
  support: 'blocks-user-support',
  account: 'blocks-user-account',
  preferences: 'blocks-user-preferences',
  notifications: 'blocks-user-notifications',
  invitation: 'blocks-user-invitation',
} as const

export { demoRoles as userRoles } from '../../shared/settings/demoSettings'

export const accountSections = [
  'Profile',
  'Account security',
  'Notification settings',
] as const

export const preferenceSections = ['Appearance', 'Saved table views'] as const

const utcTime = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
})
export const displayTime = (value: string) => utcTime.format(new Date(value))

export function userPageHref(page: keyof typeof userPageIds, item?: string) {
  const url = new URL(window.location.href)
  url.searchParams.set('gallery', userPageIds[page])
  url.searchParams.set('state', 'normal')
  url.searchParams.delete('item')
  if (item) url.searchParams.set('item', item)
  url.hash = ''
  return url.pathname + url.search
}

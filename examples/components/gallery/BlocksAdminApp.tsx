import { createSignal, For, Show } from 'solid-js'
import { DropdownMenu, InlineAlert } from '@wfe/components'
import { demoSettings } from '../../shared/settings/demoSettings'
import { useDemoSetting } from '../../shared/settings/useDemoSetting'
import { BlocksAppCatalog, catalogSections } from './BlocksAppCatalog'
import { BlocksBilling } from './BlocksBilling'
import { BlocksCreateTenant } from './BlocksCreateTenant'
import { DashboardContent, dashboardTableSections } from './BlocksDashboard'
import { dashboardGroups } from './BlocksDashboardSidebar'
import { BlocksIntegrations } from './BlocksIntegrations'
import { BlocksIssueTracker, supportSections } from './BlocksIssueTracker'
import { RecordsContent, recordGroups } from './BlocksRecordsSidebar'
import { BlocksTenantAdmin, tenantTableSections } from './BlocksTenantAdmin'
import { BlocksTenantSettings, settingsSections } from './BlocksTenantSettings'
import { BlocksUserAccount } from './BlocksUserAccount'
import { BlocksUserDetail } from './BlocksUserDetail'
import { BlocksUserHome } from './BlocksUserHome'
import { BlocksUserInvitation } from './BlocksUserInvitation'
import { BlocksUserNotifications } from './BlocksUserNotifications'
import { BlocksUserPreferences } from './BlocksUserPreferences'
import { BlocksUserSupport } from './BlocksUserSupport'
import { tabNames, tenants } from './blocksData'
import type { Tenant } from './blocksData'
import {
  accountSections,
  preferenceSections,
  userRoles,
} from './blocksUserData'
import {
  BlockNavigation,
  BlockShell,
  BlockTenantSwitcher,
  createApplicationAccess,
} from './blocksParts'

const platformDashboard = 'Platform dashboard'
const groups = [
  { title: 'Tenant', icon: 'people', family: 'tenant', sections: tabNames },
  {
    title: 'Tenant settings',
    icon: 'controls',
    family: 'settings',
    sections: settingsSections,
  },
  {
    title: 'Services',
    icon: 'navigation',
    family: 'services',
    sections: ['Billing and usage', 'Integrations and webhooks'],
  },
  ...recordGroups
    .filter((group) => group.title !== 'Support')
    .map((group) => ({ ...group, family: 'records' as const })),
  {
    title: 'Support',
    icon: 'people',
    family: 'support',
    sections: supportSections,
  },
  ...dashboardGroups.map((group) => ({
    ...group,
    family: 'dashboard' as const,
    sections:
      group.title === 'Overview'
        ? [platformDashboard, ...group.sections]
        : group.sections,
  })),
  {
    title: 'Applications',
    icon: 'grid',
    family: 'catalog',
    sections: catalogSections,
  },
  {
    title: 'Platform',
    icon: 'key',
    family: 'access',
    sections: ['User access', 'Create tenant'],
  },
] as const

const userGroups = [
  {
    title: 'Account',
    icon: 'people',
    family: 'account',
    sections: accountSections,
  },
  {
    title: 'Preferences',
    icon: 'controls',
    family: 'preferences',
    sections: preferenceSections,
  },
  {
    title: 'Onboarding',
    icon: 'form',
    family: 'onboarding',
    sections: ['Invitation and onboarding'],
  },
] as const

const customerWorkspace = {
  title: 'Workspace',
  icon: 'navigation',
  family: 'workspace',
  sections: ['My tickets', 'Notifications inbox'],
} as const

const memberWorkspace = {
  ...customerWorkspace,
  sections: ['Member home', ...customerWorkspace.sections],
} as const

const roleGroups = {
  'Platform administrator': groups,
  'Tenant administrator': groups.filter(
    ({ family }) => family !== 'dashboard' && family !== 'access',
  ),
  Member: [memberWorkspace, ...userGroups],
  Customer: [customerWorkspace, ...userGroups],
} as const

type Role = (typeof userRoles)[number]
type Family = (typeof roleGroups)[Role][number]['family']
const userFamilies = new Set<Family>(
  roleGroups.Member.map(({ family }) => family),
)

export function BlocksAdminApp() {
  const [tenant, setTenant] = createSignal<Tenant>(tenants[0])
  const [route, setRoute] = createSignal<{ family: Family; section: string }>({
    family: 'tenant',
    section: 'Members',
  })
  const [requestedTicket, setRequestedTicket] = createSignal<{ id: string }>()
  let roleTrigger: HTMLButtonElement | undefined
  const access = createApplicationAccess()
  const role = useDemoSetting('role', 'Platform administrator', revealRoleRoute)
  const [roleFailure, setRoleFailure] = createSignal('')
  const active = (family: Family) => route().family === family
  const section = (family: Family) =>
    active(family) ? route().section : undefined

  function revealRoleRoute(next: Role) {
    const current = route()
    const allowed = roleGroups[next]
    if (
      !allowed.some(
        ({ family, sections }) =>
          family === current.family &&
          sections.some((name) => name === current.section),
      )
    ) {
      const first = allowed[0]
      setRoute({ family: first.family, section: first.sections[0] })
      roleTrigger
        ?.closest('.blocks-page')
        ?.querySelector(':scope > .ui-dashboard-navigation')
        ?.scrollTo({ top: 0 })
    }
  }

  async function viewAs(value: string) {
    const next = userRoles.find((role) => role === value)
    if (!next) return
    try {
      await demoSettings.set('role', next)
      setRoleFailure('')
    } catch {
      setRoleFailure('Could not save the demo role.')
    }
  }

  return (
    <BlockShell
      title={route().section}
      header={
        <DropdownMenu>
          <DropdownMenu.Trigger
            aria-label={`View as ${role()}`}
            ref={(node) => {
              roleTrigger = node
            }}
          >
            View as · {role()}
            <DropdownMenu.Icon />
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content>
              <DropdownMenu.RadioGroup
                value={role()}
                onChange={(value) => void viewAs(value)}
              >
                <For each={userRoles}>
                  {(option) => (
                    <DropdownMenu.RadioItem value={option} closeOnSelect>
                      <DropdownMenu.ItemLabel>{option}</DropdownMenu.ItemLabel>
                      <DropdownMenu.ItemIndicator />
                    </DropdownMenu.RadioItem>
                  )}
                </For>
              </DropdownMenu.RadioGroup>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu>
      }
      fillTable={
        active('records') ||
        section('support') === 'Tickets' ||
        section('workspace') === 'My tickets' ||
        section('workspace') === 'Notifications inbox' ||
        section('preferences') === preferenceSections[1] ||
        (active('tenant') && tenantTableSections.includes(route().section)) ||
        (active('dashboard') &&
          dashboardTableSections.includes(route().section))
      }
      navigationLabel="Admin navigation"
      navigation={(controls) => (
        <>
          <BlockTenantSwitcher
            tenant={tenant()}
            onChange={setTenant}
            compact={controls.compact()}
          />
          <For each={roleGroups[role()]}>
            {(group) => (
              <BlockNavigation
                title={group.title}
                icon={group.icon}
                sections={group.sections}
                value={section(group.family)}
                onChange={(name) =>
                  setRoute({ family: group.family, section: name })
                }
                controls={controls}
                defaultOpen={
                  group.family === 'tenant' || userFamilies.has(group.family)
                }
              />
            )}
          </For>
        </>
      )}
    >
      <Show when={roleFailure()}>
        <InlineAlert announce="assertive" tone="error">
          {roleFailure()}
        </InlineAlert>
      </Show>
      <BlocksTenantAdmin
        contentOnly
        visible={active('tenant')}
        section={section('tenant')}
        tenant={tenant()}
        access={access}
      />
      <BlocksTenantSettings
        contentOnly
        visible={active('settings')}
        section={section('settings')}
        tenant={tenant()}
      />
      <BlocksBilling
        contentOnly
        visible={section('services') === 'Billing and usage'}
        tenant={tenant()}
      />
      <BlocksIntegrations
        contentOnly
        visible={section('services') === 'Integrations and webhooks'}
      />
      <RecordsContent
        visible={active('records')}
        section={section('records')}
      />
      <BlocksIssueTracker
        contentOnly
        visible={active('support')}
        section={section('support')}
      />
      <DashboardContent
        visible={active('dashboard')}
        section={
          route().section === platformDashboard
            ? undefined
            : section('dashboard')
        }
        tenant={tenant()}
      />
      <BlocksAppCatalog
        contentOnly
        visible={active('catalog')}
        section={section('catalog')}
        tenant={tenant()}
        access={access}
      />
      <BlocksUserDetail
        contentOnly
        visible={section('access') === 'User access'}
      />
      <BlocksCreateTenant
        contentOnly
        visible={section('access') === 'Create tenant'}
      />
      <BlocksUserHome
        contentOnly
        visible={section('workspace') === 'Member home'}
        tenant={tenant()}
        availableApps={access.forTenant(tenant().id)}
        onSupport={() =>
          setRoute({ family: 'workspace', section: 'My tickets' })
        }
      />
      <BlocksUserSupport
        contentOnly
        visible={section('workspace') === 'My tickets'}
        tenant={tenant()}
        requestedTicket={requestedTicket()}
      />
      <BlocksUserNotifications
        contentOnly
        visible={section('workspace') === 'Notifications inbox'}
        tenant={tenant()}
        onOpenTicket={(id) => {
          setRequestedTicket({ id })
          setRoute({ family: 'workspace', section: 'My tickets' })
        }}
        onOpenSecurity={() =>
          setRoute({ family: 'account', section: accountSections[1] })
        }
      />
      <BlocksUserAccount
        contentOnly
        visible={active('account')}
        section={section('account')}
      />
      <BlocksUserPreferences
        contentOnly
        visible={active('preferences')}
        section={section('preferences')}
      />
      <BlocksUserInvitation
        contentOnly
        visible={active('onboarding')}
        tenant={tenant()}
      />
    </BlockShell>
  )
}

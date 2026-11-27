import { lazy } from 'solid-js'

const BlocksAdminApp = lazy(() =>
  import('./BlocksAdminApp').then((module) => ({
    default: module.BlocksAdminApp,
  })),
)
const BlocksTenantAdminSidebar = lazy(() =>
  import('./BlocksTenantAdminSidebar').then((module) => ({
    default: module.BlocksTenantAdminSidebar,
  })),
)
const BlocksRecordsSidebar = lazy(() =>
  import('./BlocksRecordsSidebar').then((module) => ({
    default: module.BlocksRecordsSidebar,
  })),
)
const BlocksDashboardSidebar = lazy(() =>
  import('./BlocksDashboardSidebar').then((module) => ({
    default: module.BlocksDashboardSidebar,
  })),
)
const BlocksTenantSettings = lazy(() =>
  import('./BlocksTenantSettings').then((module) => ({
    default: module.BlocksTenantSettings,
  })),
)
const BlocksBilling = lazy(() =>
  import('./BlocksBilling').then((module) => ({
    default: module.BlocksBilling,
  })),
)
const BlocksAppCatalog = lazy(() =>
  import('./BlocksAppCatalog').then((module) => ({
    default: module.BlocksAppCatalog,
  })),
)
const BlocksUserDetail = lazy(() =>
  import('./BlocksUserDetail').then((module) => ({
    default: module.BlocksUserDetail,
  })),
)
const BlocksCreateTenant = lazy(() =>
  import('./BlocksCreateTenant').then((module) => ({
    default: module.BlocksCreateTenant,
  })),
)
const BlocksIntegrations = lazy(() =>
  import('./BlocksIntegrations').then((module) => ({
    default: module.BlocksIntegrations,
  })),
)
const BlocksTenantAdmin = lazy(() =>
  import('./BlocksTenantAdmin').then((module) => ({
    default: module.BlocksTenantAdmin,
  })),
)
const BlocksRecords = lazy(() =>
  import('./BlocksRecords').then((module) => ({
    default: module.BlocksRecords,
  })),
)
const BlocksDashboard = lazy(() =>
  import('./BlocksDashboard').then((module) => ({
    default: module.BlocksDashboard,
  })),
)
const BlocksIssueTracker = lazy(() =>
  import('./BlocksIssueTracker').then((module) => ({
    default: module.BlocksIssueTracker,
  })),
)

const BlocksUserHome = lazy(() =>
  import('./BlocksUserHome').then((module) => ({
    default: module.BlocksUserHome,
  })),
)
const BlocksUserSupport = lazy(() =>
  import('./BlocksUserSupport').then((module) => ({
    default: module.BlocksUserSupport,
  })),
)
const BlocksUserAccount = lazy(() =>
  import('./BlocksUserAccount').then((module) => ({
    default: module.BlocksUserAccount,
  })),
)
const BlocksUserPreferences = lazy(() =>
  import('./BlocksUserPreferences').then((module) => ({
    default: module.BlocksUserPreferences,
  })),
)
const BlocksUserNotifications = lazy(() =>
  import('./BlocksUserNotifications').then((module) => ({
    default: module.BlocksUserNotifications,
  })),
)
const BlocksUserInvitation = lazy(() =>
  import('./BlocksUserInvitation').then((module) => ({
    default: module.BlocksUserInvitation,
  })),
)

export const blockViews = {
  'blocks-admin-app': BlocksAdminApp,
  'blocks-tenant-admin': BlocksTenantAdmin,
  'blocks-records': BlocksRecords,
  'blocks-dashboard': BlocksDashboard,
  'blocks-tenant-admin-sidebar': BlocksTenantAdminSidebar,
  'blocks-records-sidebar': BlocksRecordsSidebar,
  'blocks-dashboard-sidebar': BlocksDashboardSidebar,
  'blocks-tenant-settings': BlocksTenantSettings,
  'blocks-billing': BlocksBilling,
  'blocks-app-catalog': BlocksAppCatalog,
  'blocks-user-detail': BlocksUserDetail,
  'blocks-create-tenant': BlocksCreateTenant,
  'blocks-integrations': BlocksIntegrations,
  'blocks-issue-tracker': BlocksIssueTracker,
  'blocks-user-home': BlocksUserHome,
  'blocks-user-support': BlocksUserSupport,
  'blocks-user-account': BlocksUserAccount,
  'blocks-user-preferences': BlocksUserPreferences,
  'blocks-user-notifications': BlocksUserNotifications,
  'blocks-user-invitation': BlocksUserInvitation,
}

export function preloadBlockView(id: string | null) {
  if (!id || !Object.hasOwn(blockViews, id)) return
  // Rendering the same lazy view reports any import error through Solid.
  void blockViews[id as keyof typeof blockViews].preload().catch(() => {})
}

import { createEffect, createMemo, createSignal, For, Show } from 'solid-js'
import {
  Button,
  EmptyState,
  Field,
  Input,
  Label,
  Dialog,
  FormActions,
} from '@wfe/components'
import { DashboardGrid, DashboardPanel } from '@wfe/components/layout'
import {
  BlockNavigation,
  BlockNotice,
  BlockShell,
  BlockStatus,
  createApplicationAccess,
} from './blocksParts'
import { catalogApps, tenants } from './blocksData'
import type { Tenant } from './blocksData'

export const catalogSections = [
  'Application catalog',
  ...catalogApps.map((app) => app.category),
]

export function BlocksAppCatalog(props: {
  contentOnly?: boolean
  visible?: boolean
  section?: string
  tenant?: Tenant
  access?: ReturnType<typeof createApplicationAccess>
}) {
  const tenant = () => props.tenant ?? tenants[0]
  const [selectedSection, setSection] = createSignal(catalogSections[0]!)
  const section = () => props.section ?? selectedSection()
  const access =
    props.access ?? createApplicationAccess({ northwind: ['Billing'] })
  const installed = () => access.forTenant(tenant().id)
  const [search, setSearch] = createSignal('')
  const [pending, setPending] = createSignal<(typeof catalogApps)[number]>()
  const [message, setMessage] = createSignal('')
  let installTrigger: HTMLButtonElement | undefined
  let confirmInstall: HTMLButtonElement | undefined
  createEffect(
    () => tenant().id,
    () => {
      setMessage('')
      setPending(undefined)
    },
  )
  const matching = createMemo(() =>
    catalogApps.filter(
      (app) =>
        (section() === 'Application catalog' || app.category === section()) &&
        `${app.name} ${app.description}`
          .toLowerCase()
          .includes(search().trim().toLowerCase()),
    ),
  )

  return (
    <BlockShell
      title={section()}
      contentOnly={props.contentOnly}
      visible={props.visible}
      navigationLabel="Application categories"
      navigation={
        props.contentOnly
          ? undefined
          : (controls) => (
              <BlockNavigation
                title="Categories"
                sections={catalogSections}
                value={section()}
                onChange={setSection}
                controls={controls}
              />
            )
      }
    >
      <DashboardPanel>
        <Field>
          <Label>Search applications</Label>
          <Input type="search" value={search()} onValueChange={setSearch} />
        </Field>
      </DashboardPanel>
      <BlockNotice message={message()} />
      <Show
        when={matching().length}
        fallback={
          <DashboardPanel>
            <EmptyState>No applications match your search.</EmptyState>
          </DashboardPanel>
        }
      >
        <DashboardGrid>
          <For each={matching()}>
            {(app) => {
              const active = () => installed().includes(app.name)
              return (
                <DashboardPanel
                  title={app.name}
                  titleAs="h3"
                  description={
                    <>
                      {app.description}
                      <div>{app.category}</div>
                    </>
                  }
                  headerEnd={
                    <BlockStatus value={active() ? 'Installed' : 'Available'} />
                  }
                  footer={
                    <Show when={!active()}>
                      <Button
                        tone="primary"
                        onClick={(event) => {
                          installTrigger = event.currentTarget
                          setPending(app)
                        }}
                      >
                        Install {app.name}
                      </Button>
                    </Show>
                  }
                />
              )
            }}
          </For>
        </DashboardGrid>
      </Show>
      <Dialog
        open={Boolean(pending())}
        onOpenChange={(open) => {
          if (!open) setPending(undefined)
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content
            initialFocus={() => confirmInstall}
            restoreFocus={() => installTrigger}
          >
            <Dialog.Title>Install {pending()?.name}</Dialog.Title>
            <Dialog.Description>
              Review the permissions for {tenant().name}.
            </Dialog.Description>
            <ul>
              <For each={pending()?.permissions}>
                {(permission) => <li>{permission}</li>}
              </For>
            </ul>
            <FormActions>
              <Button
                tone="primary"
                ref={(node) => {
                  confirmInstall = node
                }}
                onClick={() => {
                  const app = pending()
                  if (!app) return
                  access.update(tenant().id, (names) => [...names, app.name])
                  setMessage(`Installed ${app.name} for ${tenant().name}.`)
                  setPending(undefined)
                }}
              >
                Confirm install
              </Button>
              <Dialog.CloseButton aria-label="Cancel">
                Cancel
              </Dialog.CloseButton>
            </FormActions>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </BlockShell>
  )
}

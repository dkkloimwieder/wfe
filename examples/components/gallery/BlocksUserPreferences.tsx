import { createMemo, createSignal, Show, useContext } from 'solid-js'
import {
  AlertDialog,
  Button,
  Dialog,
  EmptyState,
  Field,
  FieldError,
  FormActions,
  FormGrid,
  InlineAlert,
  Input,
  Label,
  SelectField,
} from '@wfe/components'
import { nativeEvents } from '@wfe/components/events'
import { DashboardPanel } from '@wfe/components/layout'
import type { ThemeDensity } from '@wfe/components/theme'
import { choicesFor } from './blocksData'
import {
  BlockNavigation,
  BlockNotice,
  BlockShell,
  BlockTable,
  createBlockTable,
} from './blocksParts'
import { preferenceSections, userRoles } from './blocksUserData'
import type { UserPageProps } from './blocksUserData'
import { UserAppearance, userTables, useUserViews } from './BlocksUserState'
import type { UserViewRow } from './BlocksUserState'

const appearanceChoices = ['Light', 'Dark', 'System'] as const
const densityChoices = [
  { value: 'default', label: 'Standard' },
  { value: 'compact', label: 'Compact' },
  { value: 'comfortable', label: 'Comfortable' },
] as const
const landingChoices = choicesFor([
  'Member home',
  'My tickets',
  'Notifications inbox',
  'Profile',
])
const roles = choicesFor(userRoles)

export function BlocksUserPreferences(
  props: UserPageProps & { section?: string } = {},
) {
  const appearance = useContext(UserAppearance)
  const store = useUserViews()
  const [section, setSection] = createSignal<string>(preferenceSections[0])
  const active = () => props.section ?? section()
  const [standaloneDensity, setStandaloneDensity] =
    createSignal<ThemeDensity>('default')
  const [defaults, setDefaults] = createSignal({
    landing: 'Member home',
    role: 'Member',
  })
  const [landing, setLanding] = createSignal('Member home')
  const [role, setRole] = createSignal('Member')
  const [defaultsNotice, setDefaultsNotice] = createSignal('')
  const [viewsNotice, setViewsNotice] = createSignal('')
  const [rename, setRename] = createSignal<UserViewRow>()
  const [remove, setRemove] = createSignal<UserViewRow>()
  const [name, setName] = createSignal('')
  const [nameError, setNameError] = createSignal('')
  const [viewsBusy, setViewsBusy] = createSignal(false)
  const rows = createMemo(() =>
    userTables.flatMap((table) =>
      store.lists()[table].views.map((view) => ({
        id: `${table} / ${view.id}`,
        table,
        view,
        name: view.name,
        defaultView:
          store.lists()[table].defaultId === view.id ? 'Default' : '',
      })),
    ),
  )
  const table = createBlockTable(rows, [
    { id: 'name', header: 'Saved view', accessorKey: 'name' },
    { id: 'table', header: 'Table', accessorKey: 'table' },
    { id: 'defaultView', header: 'Default', accessorKey: 'defaultView' },
  ])
  let renameInput: HTMLInputElement | undefined
  let menuTrigger: (() => HTMLButtonElement | undefined) | undefined

  async function saveRename(event: SubmitEvent) {
    event.preventDefault()
    const entry = rename()
    const title = name().trim()
    if (!entry || !title || viewsBusy()) return
    if (
      store
        .lists()
        [entry.table].views.some(
          (view) =>
            view.id !== entry.view.id &&
            view.name.toLowerCase() === title.toLowerCase(),
        )
    ) {
      setNameError('A view for this table already uses that name.')
      return
    }
    setViewsBusy(true)
    try {
      await store.storage[entry.table].save(
        { ...entry.view, name: title },
        new AbortController().signal,
      )
      setViewsNotice(`Renamed the view to ${title}.`)
      setRename(undefined)
    } catch {
      setNameError('Could not rename the saved view.')
    } finally {
      setViewsBusy(false)
    }
  }

  async function deleteView() {
    const entry = remove()
    if (!entry || viewsBusy()) return
    setViewsBusy(true)
    try {
      await store.storage[entry.table].remove(
        entry.view.id,
        new AbortController().signal,
      )
      setViewsNotice(`Deleted ${entry.view.name}.`)
      setRemove(undefined)
    } catch {
      setViewsNotice('Could not delete the saved view.')
    } finally {
      setViewsBusy(false)
    }
  }

  return (
    <BlockShell
      title={active()}
      fillTable={active() === preferenceSections[1]}
      contentOnly={props.contentOnly}
      visible={props.visible}
      navigationLabel="Preferences navigation"
      navigation={(controls) => (
        <BlockNavigation
          title="Preferences"
          icon="controls"
          sections={preferenceSections}
          value={active()}
          onChange={setSection}
          controls={controls}
        />
      )}
    >
      <Show when={active() === preferenceSections[0]}>
        <DashboardPanel
          title="Display"
          titleAs="h3"
          description="Changes apply immediately."
        >
          <FormGrid columns={2}>
            <Field>
              <Label>Appearance</Label>
              <SelectField
                label="Appearance"
                choices={choicesFor(appearanceChoices)}
                value={appearance?.choice() ?? 'System'}
                onValueChange={(value) => {
                  const choice = appearanceChoices.find(
                    (item) => item === value,
                  )
                  if (choice) appearance?.setChoice(choice)
                }}
              />
            </Field>
            <Field>
              <Label>Density</Label>
              <SelectField
                label="Density"
                choices={densityChoices}
                value={appearance?.density() ?? standaloneDensity()}
                onValueChange={(value) => {
                  const density = densityChoices.find(
                    (item) => item.value === value,
                  )?.value
                  if (density)
                    (appearance?.setDensity ?? setStandaloneDensity)(density)
                }}
              />
            </Field>
          </FormGrid>
          <Show when={appearance?.failure()}>
            <InlineAlert announce="assertive" tone="error">
              {appearance?.failure()}
            </InlineAlert>
          </Show>
        </DashboardPanel>
        <DashboardPanel title="Sign-in defaults" titleAs="h3">
          <FormGrid
            as="form"
            columns={2}
            ref={nativeEvents<HTMLFormElement>({
              submit(event) {
                event.preventDefault()
                setDefaults({ landing: landing(), role: role() })
                setDefaultsNotice('Sign-in defaults saved.')
              },
            })}
            footer={
              <Button
                type="submit"
                tone="primary"
                disabled={
                  landing() === defaults().landing && role() === defaults().role
                }
              >
                Save defaults
              </Button>
            }
          >
            <Field>
              <Label>Default landing page</Label>
              <SelectField
                label="Default landing page"
                choices={landingChoices}
                value={landing()}
                onValueChange={(value) => {
                  setLanding(value)
                  setDefaultsNotice('')
                }}
              />
            </Field>
            <Field>
              <Label>Default role</Label>
              <SelectField
                label="Default role"
                choices={roles}
                value={role()}
                onValueChange={(value) => {
                  setRole(value)
                  setDefaultsNotice('')
                }}
              />
            </Field>
          </FormGrid>
          <BlockNotice message={defaultsNotice()} />
        </DashboardPanel>
      </Show>
      <Show when={active() === preferenceSections[1]}>
        <BlockTable
          title="Saved table views"
          table={table}
          minWidth="27rem"
          filterMode="live"
          search={{ label: 'Search saved table views' }}
          emptyResults={() => (
            <EmptyState>No matching saved table views.</EmptyState>
          )}
          rowActions={(row, context) => {
            const item = row.original
            if (!item) return
            return [
              {
                label: 'Rename',
                onSelect: () => {
                  menuTrigger = context.getMenuTrigger
                  setName(item.view.name)
                  setNameError('')
                  setRename(item)
                },
              },
              { label: 'Delete', onSelect: () => setRemove(item) },
            ]
          }}
        />
        <BlockNotice message={viewsNotice()} />
        <Dialog
          open={Boolean(rename())}
          onOpenChange={(open) => {
            if (!open) setRename(undefined)
          }}
        >
          <Dialog.Portal>
            <Dialog.Overlay />
            <Dialog.Content
              initialFocus={() => renameInput}
              restoreFocus={() => menuTrigger?.()}
            >
              <Dialog.Title>Rename saved view</Dialog.Title>
              <Dialog.Description>
                Change the name of this view for {rename()?.table}.
              </Dialog.Description>
              <FormGrid
                as="form"
                ref={nativeEvents<HTMLFormElement>({
                  submit: (event) => void saveRename(event),
                })}
                footer={
                  <>
                    <Button
                      type="submit"
                      tone="primary"
                      disabled={!name().trim() || viewsBusy()}
                    >
                      Save name
                    </Button>
                    <Dialog.CloseButton aria-label="Cancel">
                      Cancel
                    </Dialog.CloseButton>
                  </>
                }
              >
                <Field invalid={Boolean(nameError())}>
                  <Label>View name</Label>
                  <Input
                    ref={(node) => {
                      renameInput = node
                    }}
                    value={name()}
                    required
                    maxlength={80}
                    onInput={(event) => {
                      setName(event.currentTarget.value)
                      setNameError('')
                    }}
                  />
                  <Show when={nameError()}>
                    <FieldError>{nameError()}</FieldError>
                  </Show>
                </Field>
              </FormGrid>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog>
        <AlertDialog
          open={Boolean(remove())}
          onOpenChange={(open) => {
            if (!open) setRemove(undefined)
          }}
        >
          <AlertDialog.Portal>
            <AlertDialog.Overlay />
            <AlertDialog.Content>
              <AlertDialog.Title>Delete saved view?</AlertDialog.Title>
              <AlertDialog.Description>
                {remove()?.view.name} will be removed from {remove()?.table}.
              </AlertDialog.Description>
              <FormActions>
                <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
                <AlertDialog.Action
                  onClick={() => void deleteView()}
                  disabled={viewsBusy()}
                >
                  Delete view
                </AlertDialog.Action>
              </FormActions>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        </AlertDialog>
      </Show>
    </BlockShell>
  )
}

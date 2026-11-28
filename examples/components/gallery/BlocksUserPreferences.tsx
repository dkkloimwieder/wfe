import { createMemo, createSignal, Show, useContext } from 'solid-js'
import {
  AlertDialog,
  Button,
  EmptyState,
  Field,
  FieldError,
  FormActions,
  FormGrid,
  InlineAlert,
  Input,
  Label,
  SelectField,
  Sheet,
} from '@wfe/components'
import { nativeEvents } from '@wfe/components/events'
import { DashboardPanel } from '@wfe/components/layout'
import type { ThemeDensity } from '@wfe/components/theme'
import { demoSettings } from '../../shared/settings/demoSettings'
import type { DemoRole } from '../../shared/settings/demoSettings'
import { signInLandingPages } from '../../shared/settings/SettingsStore'
import type { Settings } from '../../shared/settings/SettingsStore'
import { useDemoSetting } from '../../shared/settings/useDemoSetting'
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
import type { UserAppearanceChoice, UserViewRow } from './BlocksUserState'

const [appearanceSection, defaultsSection, viewsSection] = preferenceSections
const appearanceChoices = ['Light', 'Dark', 'System'] as const
const densityChoices = [
  { value: 'default', label: 'Standard' },
  { value: 'compact', label: 'Compact' },
  { value: 'comfortable', label: 'Comfortable' },
] as const
const landingChoices = choicesFor(signInLandingPages)
const roles = choicesFor(userRoles)

export function BlocksUserPreferences(
  props: UserPageProps & { section?: string } = {},
) {
  const appearance = useContext(UserAppearance)
  const store = useUserViews()
  const [section, setSection] = createSignal<string>(appearanceSection)
  const active = () => props.section ?? section()
  const [appearanceDraft, setAppearanceDraft] =
    createSignal<UserAppearanceChoice>()
  const [densityDraft, setDensityDraft] = createSignal<ThemeDensity>()
  const displayChoice = () =>
    appearanceDraft() ?? appearance?.choice() ?? 'System'
  const displayDensity = () =>
    densityDraft() ?? appearance?.density() ?? 'default'
  const displayChanged = () =>
    displayChoice() !== appearance?.choice() ||
    displayDensity() !== appearance?.density()
  const [displayBusy, setDisplayBusy] = createSignal(false)
  const [displayNotice, setDisplayNotice] = createSignal('')
  const [displayError, setDisplayError] = createSignal('')

  const initialDefaults = { landing: 'Member home', role: 'Member' } as const
  const savedDefaults = useDemoSetting('signInDefaults', initialDefaults)
  const [defaultsDraft, setDefaultsDraft] = createSignal<
    Partial<Settings<DemoRole>['signInDefaults']>
  >({})
  const defaults = () => ({ ...savedDefaults(), ...defaultsDraft() })
  const [defaultsBusy, setDefaultsBusy] = createSignal(false)
  const [defaultsNotice, setDefaultsNotice] = createSignal('')
  const [defaultsError, setDefaultsError] = createSignal('')
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

  async function saveDisplay(event: SubmitEvent) {
    event.preventDefault()
    if (!appearance || !displayChanged() || displayBusy()) return
    const choice = displayChoice()
    const density = displayDensity()
    setDisplayBusy(true)
    setDisplayError('')
    try {
      if (choice !== appearance.choice()) {
        if (!(await appearance.setChoice(choice))) {
          setDisplayError('Could not save the appearance.')
          return
        }
      }
      setAppearanceDraft((draft) => (draft === choice ? undefined : draft))
      if (density !== appearance.density()) {
        await demoSettings.set('density', density)
      }
      setDensityDraft((draft) => (draft === density ? undefined : draft))
      setDisplayNotice('Appearance saved.')
    } catch {
      setDisplayError('Could not save the density.')
    } finally {
      setDisplayBusy(false)
    }
  }

  async function saveDefaults(event: SubmitEvent) {
    event.preventDefault()
    if (defaultsBusy()) return
    const draft = defaultsDraft()
    setDefaultsBusy(true)
    setDefaultsError('')
    try {
      await demoSettings.update('signInDefaults', (saved) => ({
        ...initialDefaults,
        ...saved,
        ...draft,
      }))
      setDefaultsDraft((current) => (current === draft ? {} : current))
      setDefaultsNotice('Sign-in defaults saved.')
    } catch {
      setDefaultsError('Could not save the sign-in defaults.')
    } finally {
      setDefaultsBusy(false)
    }
  }

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
      fillTable={active() === viewsSection}
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
      <Show when={active() === appearanceSection}>
        <DashboardPanel title="Display" titleAs="h3">
          <FormGrid
            as="form"
            columns={2}
            ref={nativeEvents<HTMLFormElement>({
              submit: (event) => void saveDisplay(event),
            })}
            footer={
              <Button
                type="submit"
                tone="primary"
                disabled={!appearance || !displayChanged() || displayBusy()}
              >
                Save appearance
              </Button>
            }
          >
            <Field>
              <Label>Appearance</Label>
              <SelectField
                label="Appearance"
                choices={choicesFor(appearanceChoices)}
                value={displayChoice()}
                onValueChange={(value) => {
                  const choice = appearanceChoices.find(
                    (item) => item === value,
                  )
                  if (!choice) return
                  setAppearanceDraft(choice)
                  setDisplayNotice('')
                  setDisplayError('')
                }}
              />
            </Field>
            <Field>
              <Label>Density</Label>
              <SelectField
                label="Density"
                choices={densityChoices}
                value={displayDensity()}
                onValueChange={(value) => {
                  const density = densityChoices.find(
                    (item) => item.value === value,
                  )?.value
                  if (!density) return
                  setDensityDraft(density)
                  setDisplayNotice('')
                  setDisplayError('')
                }}
              />
            </Field>
          </FormGrid>
          <BlockNotice message={displayNotice()} />
          <Show when={displayError()}>
            <InlineAlert announce="assertive" tone="error">
              {displayError()}
            </InlineAlert>
          </Show>
        </DashboardPanel>
      </Show>
      <Show when={active() === defaultsSection}>
        <DashboardPanel title={defaultsSection} titleAs="h3">
          <FormGrid
            as="form"
            columns={2}
            ref={nativeEvents<HTMLFormElement>({
              submit: (event) => void saveDefaults(event),
            })}
            footer={
              <Button
                type="submit"
                tone="primary"
                disabled={
                  defaultsBusy() ||
                  (defaults().landing === savedDefaults().landing &&
                    defaults().role === savedDefaults().role)
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
                value={defaults().landing}
                onValueChange={(value) => {
                  const landing = signInLandingPages.find(
                    (item) => item === value,
                  )
                  if (!landing) return
                  setDefaultsDraft((current) => ({ ...current, landing }))
                  setDefaultsNotice('')
                  setDefaultsError('')
                }}
              />
            </Field>
            <Field>
              <Label>Default role</Label>
              <SelectField
                label="Default role"
                choices={roles}
                value={defaults().role}
                onValueChange={(value) => {
                  const role = userRoles.find((item) => item === value)
                  if (!role) return
                  setDefaultsDraft((current) => ({ ...current, role }))
                  setDefaultsNotice('')
                  setDefaultsError('')
                }}
              />
            </Field>
          </FormGrid>
          <BlockNotice message={defaultsNotice()} />
          <Show when={defaultsError()}>
            <InlineAlert announce="assertive" tone="error">
              {defaultsError()}
            </InlineAlert>
          </Show>
        </DashboardPanel>
      </Show>
      <Show when={active() === viewsSection}>
        <BlockTable
          title={viewsSection}
          table={table}
          minWidth="27rem"
          filterMode="live"
          search={{ label: 'Search saved table views' }}
          emptyResults={() => (
            <EmptyState>No matching saved table views.</EmptyState>
          )}
          toolbarActions={<BlockNotice message={viewsNotice()} />}
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
        <Sheet
          open={Boolean(rename())}
          onOpenChange={(open) => {
            if (!open) setRename(undefined)
          }}
        >
          <Sheet.Portal>
            <Sheet.Overlay />
            <Sheet.Content
              size="wide"
              initialFocus={() => renameInput}
              restoreFocus={() => menuTrigger?.()}
            >
              <Sheet.Title>Rename saved view</Sheet.Title>
              <Sheet.Description>
                Change the name of this view for {rename()?.table}.
              </Sheet.Description>
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
                    <Sheet.CloseButton aria-label="Cancel">
                      Cancel
                    </Sheet.CloseButton>
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
            </Sheet.Content>
          </Sheet.Portal>
        </Sheet>
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

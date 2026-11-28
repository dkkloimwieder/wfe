import { createSignal, For, onCleanup, Show } from 'solid-js'
import {
  AlertDialog,
  Badge,
  Button,
  EmptyState,
  Field,
  FieldError,
  FieldGroup,
  FileInput,
  FormActions,
  FormGrid,
  HelpText,
  InlineAlert,
  Input,
  Label,
  SelectField,
  Sheet,
  StepList,
  SummaryList,
  SwitchField,
} from '@wfe/components'
import { nativeEvents } from '@wfe/components/events'
import { DashboardPanel } from '@wfe/components/layout'
import type { TableRowActionContext } from '@wfe/components/table'
import { demoSettings } from '../../shared/settings/demoSettings'
import type { ProfileSettings } from '../../shared/settings/SettingsStore'
import { useDemoSetting } from '../../shared/settings/useDemoSetting'
import {
  choicesFor,
  notificationTypes,
  personalTokens,
  userAccessSessions,
  userMember,
} from './blocksData'
import {
  blockCellText,
  BlockDate,
  BlockNavigation,
  BlockNotice,
  BlockShell,
  BlockTable,
  createBlockTable,
} from './blocksParts'
import { accountSections, accountTableSections } from './blocksUserData'
import type { UserPageProps } from './blocksUserData'
import { useUserViews } from './BlocksUserState'

const languages = choicesFor(['English', 'Spanish', 'French'])
const timeZones = [
  { value: 'America/New_York', label: 'Eastern time' },
  { value: 'America/Chicago', label: 'Central time' },
  { value: 'America/Denver', label: 'Mountain time' },
  { value: 'America/Los_Angeles', label: 'Pacific time' },
  { value: 'Europe/London', label: 'London' },
  { value: 'UTC', label: 'UTC' },
]
const channels = ['Email', 'In-app'] as const
const securityPageSizes = [5, 10] as const
const twoFactorSteps = [
  { id: 'key', label: 'Setup key' },
  { id: 'verify', label: 'Verify code' },
]
const examplePassword = 'Northwind-demo-26'

const [
  profileSection,
  securitySection,
  sessionsSection,
  tokensSection,
  notificationsSection,
] = accountSections
type Token = (typeof personalTokens)[number]
type Session = (typeof userAccessSessions)[number]
type Revoke =
  { kind: 'session'; value: Session } | { kind: 'token'; value: Token }

function PasswordSheet(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onChange: (current: string, next: string) => boolean
}) {
  const [current, setCurrent] = createSignal('')
  const [password, setPassword] = createSignal('')
  const [confirmation, setConfirmation] = createSignal('')
  const [error, setError] = createSignal('')
  function changeOpen(open: boolean) {
    props.onOpenChange(open)
    if (open) return
    setCurrent('')
    setPassword('')
    setConfirmation('')
    setError('')
  }
  function save(event: SubmitEvent) {
    event.preventDefault()
    if (password().length < 12) {
      setError('The new password must have at least 12 characters.')
    } else if (password() !== confirmation()) {
      setError('The new passwords must match.')
    } else if (!props.onChange(current(), password())) {
      setError('The current password is incorrect.')
    } else {
      changeOpen(false)
    }
  }
  return (
    <Sheet open={props.open} onOpenChange={changeOpen}>
      <Sheet.Portal>
        <Sheet.Overlay />
        <Sheet.Content size="wide">
          <Sheet.Title>Change password</Sheet.Title>
          <Sheet.Description>
            Choose a new password with at least 12 characters.
          </Sheet.Description>
          <FormGrid
            as="form"
            ref={nativeEvents<HTMLFormElement>({ submit: save })}
            footer={
              <>
                <Button type="submit" tone="primary">
                  Save password
                </Button>
                <Sheet.CloseButton aria-label="Cancel">
                  Cancel
                </Sheet.CloseButton>
              </>
            }
          >
            <Field>
              <Label>Current password</Label>
              <Input
                type="password"
                autocomplete="current-password"
                required
                value={current()}
                onInput={(event) => setCurrent(event.currentTarget.value)}
              />
              <HelpText>Initial demo password {examplePassword}</HelpText>
            </Field>
            <Field>
              <Label>New password</Label>
              <Input
                type="password"
                autocomplete="new-password"
                minlength={12}
                required
                value={password()}
                onInput={(event) => setPassword(event.currentTarget.value)}
              />
            </Field>
            <Field invalid={Boolean(error())}>
              <Label>Confirm new password</Label>
              <Input
                type="password"
                autocomplete="new-password"
                minlength={12}
                required
                value={confirmation()}
                onInput={(event) => setConfirmation(event.currentTarget.value)}
              />
              <Show when={error()}>
                <FieldError>{error()}</FieldError>
              </Show>
            </Field>
          </FormGrid>
        </Sheet.Content>
      </Sheet.Portal>
    </Sheet>
  )
}

function TwoFactorSheet(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onVerified: () => void
}) {
  const [step, setStep] = createSignal('key')
  const [code, setCode] = createSignal('')
  const [error, setError] = createSignal(false)
  let nextButton: HTMLButtonElement | undefined
  let codeField: HTMLInputElement | undefined

  function changeOpen(open: boolean) {
    props.onOpenChange(open)
    if (open) return
    setStep('key')
    setCode('')
    setError(false)
  }

  function verify(event: SubmitEvent) {
    event.preventDefault()
    if (code() !== '246810') {
      setError(true)
      return
    }
    props.onVerified()
    changeOpen(false)
  }

  return (
    <Sheet open={props.open} onOpenChange={changeOpen}>
      <Sheet.Portal>
        <Sheet.Overlay />
        <Sheet.Content
          size="wide"
          focusKey={step()}
          initialFocus={() => (step() === 'key' ? nextButton : codeField)}
        >
          <Sheet.Title>Set up two-factor authentication</Sheet.Title>
          <Sheet.Description>
            Add a code from an authenticator app when you sign in.
          </Sheet.Description>
          <StepList
            steps={twoFactorSteps}
            current={step()}
            onStepChange={setStep}
            aria-label="Two-factor setup steps"
          />
          <Show
            when={step() === 'verify'}
            fallback={
              <FormGrid
                footer={
                  <>
                    <Button
                      ref={(node) => {
                        nextButton = node
                      }}
                      tone="primary"
                      onClick={() => setStep('verify')}
                    >
                      Continue
                    </Button>
                    <Sheet.CloseButton aria-label="Cancel">
                      Cancel
                    </Sheet.CloseButton>
                  </>
                }
              >
                <Field>
                  <Label>Demo setup key</Label>
                  <Input readonly value="NORTHWIND-DEMO-KEY" />
                  <HelpText>
                    In this example, continue and enter the sample verification
                    code.
                  </HelpText>
                </Field>
              </FormGrid>
            }
          >
            <FormGrid
              as="form"
              ref={nativeEvents<HTMLFormElement>({ submit: verify })}
              footer={
                <>
                  <Button type="submit" tone="primary">
                    Verify and enable
                  </Button>
                  <Sheet.CloseButton aria-label="Cancel">
                    Cancel
                  </Sheet.CloseButton>
                </>
              }
            >
              <Field invalid={error()}>
                <Label>Verification code</Label>
                <Input
                  ref={(node) => {
                    codeField = node
                  }}
                  inputmode="numeric"
                  autocomplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxlength={6}
                  required
                  value={code()}
                  onInput={(event) => {
                    setCode(event.currentTarget.value)
                    setError(false)
                  }}
                />
                <HelpText>Use sample code 246810.</HelpText>
                <Show when={error()}>
                  <FieldError>Enter the sample code to continue.</FieldError>
                </Show>
              </Field>
            </FormGrid>
          </Show>
        </Sheet.Content>
      </Sheet.Portal>
    </Sheet>
  )
}

function TokenSheet(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (name: string) => string
}) {
  const [name, setName] = createSignal('')
  const [value, setValue] = createSignal('')
  let nameField: HTMLInputElement | undefined
  let tokenField: HTMLInputElement | undefined

  function changeOpen(open: boolean) {
    props.onOpenChange(open)
    if (open) return
    setName('')
    setValue('')
  }

  return (
    <Sheet open={props.open} onOpenChange={changeOpen}>
      <Sheet.Portal>
        <Sheet.Overlay />
        <Sheet.Content
          size="wide"
          initialFocus={() => (value() ? tokenField : nameField)}
          focusKey={Boolean(value())}
        >
          <Sheet.Title>Create a personal access token</Sheet.Title>
          <Sheet.Description>
            Use a token to sign in from a script or tool.
          </Sheet.Description>
          <Show
            when={value()}
            fallback={
              <FormGrid
                as="form"
                ref={nativeEvents<HTMLFormElement>({
                  submit(event) {
                    event.preventDefault()
                    if (name().trim()) setValue(props.onCreate(name().trim()))
                  },
                })}
                footer={
                  <>
                    <Button
                      type="submit"
                      tone="primary"
                      disabled={!name().trim()}
                    >
                      Create token
                    </Button>
                    <Sheet.CloseButton aria-label="Cancel">
                      Cancel
                    </Sheet.CloseButton>
                  </>
                }
              >
                <Field>
                  <Label>Token name</Label>
                  <Input
                    ref={(node) => {
                      nameField = node
                    }}
                    value={name()}
                    required
                    maxlength={60}
                    onInput={(event) => setName(event.currentTarget.value)}
                  />
                </Field>
              </FormGrid>
            }
          >
            {(token) => (
              <FormGrid
                footer={
                  <Sheet.CloseButton aria-label="Done">Done</Sheet.CloseButton>
                }
              >
                <Field>
                  <Label>Personal access token</Label>
                  <Input
                    ref={(node) => {
                      tokenField = node
                    }}
                    value={token()}
                    readonly
                  />
                  <HelpText>
                    Copy this sample token now. It is shown once.
                  </HelpText>
                </Field>
              </FormGrid>
            )}
          </Show>
        </Sheet.Content>
      </Sheet.Portal>
    </Sheet>
  )
}

export function BlocksUserAccount(
  props: UserPageProps & { section?: string } = {},
) {
  const requestedSection = new URLSearchParams(window.location.search).get(
    'item',
  )
  const [selected, setSelected] = createSignal<string>(
    requestedSection === 'security' ? securitySection : profileSection,
  )
  const section = () => props.section ?? selected()
  const savedProfile = useDemoSetting('profile', userMember)
  const [profileDraft, setProfileDraft] = createSignal<
    Partial<ProfileSettings>
  >({})
  const profile = () => ({ ...savedProfile(), ...profileDraft() })
  const [avatar, setAvatar] = createSignal<File>()
  const [savingProfile, setSavingProfile] = createSignal(false)
  const [profileError, setProfileError] = createSignal('')
  const [avatarUrl, setAvatarUrl] = createSignal('')
  let avatarObjectUrl = ''
  let disposed = false
  onCleanup(() => {
    disposed = true
    if (avatarObjectUrl) URL.revokeObjectURL(avatarObjectUrl)
  })
  const [profileNotice, setProfileNotice] = createSignal('')
  const [securityNotice, setSecurityNotice] = createSignal<{
    section: string
    message: string
  }>()
  const currentNotice = () => {
    const notice = securityNotice()
    return notice?.section === section() ? notice.message : undefined
  }
  const views = useUserViews()
  const [sessions, setSessions] = createSignal(userAccessSessions)
  const [tokens, setTokens] = createSignal(personalTokens)
  const [passwordOpen, setPasswordOpen] = createSignal(false)
  const [password, setPassword] = createSignal(examplePassword)
  const [twoFactorOpen, setTwoFactorOpen] = createSignal(false)
  const [twoFactor, setTwoFactor] = createSignal(false)
  const [tokenOpen, setTokenOpen] = createSignal(false)
  const [pending, setPending] = createSignal<Revoke>()
  const confirmation = () => {
    const item = pending()
    if (!item) return ''
    return item.kind === 'session'
      ? `${item.value.device} will be signed out.`
      : `${item.value.name} will lose access.`
  }
  const notificationChannels = useDemoSetting('notificationChannels', undefined)
  const [notificationDraft, setNotificationDraft] = createSignal<
    Record<string, boolean>
  >({})
  const [notificationNotice, setNotificationNotice] = createSignal('')
  const [notificationError, setNotificationError] = createSignal('')
  const [savingNotifications, setSavingNotifications] = createSignal(false)
  let confirmationTrigger: TableRowActionContext['getMenuTrigger'] | undefined
  let confirmationFallback: HTMLElement | null | undefined

  function askToRevoke(
    item: Revoke,
    getMenuTrigger: TableRowActionContext['getMenuTrigger'],
  ) {
    confirmationTrigger = getMenuTrigger
    confirmationFallback = getMenuTrigger()
      ?.closest('.table-workspace')
      ?.querySelector<HTMLElement>('.table-controls-toggle')
    setPending(item)
  }

  const sessionsTable = createBlockTable(sessions, [
    { id: 'device', header: 'Device', accessorKey: 'device' },
    { id: 'active', header: 'Last active (UTC)', accessorKey: 'active' },
    {
      id: 'status',
      header: 'Status',
      accessorFn: (row) => (row.current ? 'Current session' : ''),
    },
  ])
  const tokensTable = createBlockTable(tokens, [
    { id: 'name', header: 'Name', accessorKey: 'name' },
    { id: 'created', header: 'Created', accessorKey: 'created' },
    { id: 'lastUsed', header: 'Last used', accessorKey: 'lastUsed' },
  ])

  async function saveProfile(event: SubmitEvent) {
    event.preventDefault()
    if (!profile().name.trim() || savingProfile()) return
    const draft = profileDraft()
    const image = avatar()
    setSavingProfile(true)
    setProfileError('')
    try {
      await demoSettings.update('profile', (saved) => {
        const next = { ...userMember, ...saved, ...draft }
        return { ...next, name: next.name.trim(), email: next.email.trim() }
      })
      if (disposed) return
      setProfileDraft((current) => (current === draft ? {} : current))
      if (avatarObjectUrl) URL.revokeObjectURL(avatarObjectUrl)
      avatarObjectUrl = image ? URL.createObjectURL(image) : ''
      setAvatarUrl(avatarObjectUrl)
      setProfileNotice('Profile saved.')
    } catch {
      setProfileError('Could not save your profile.')
    } finally {
      setSavingProfile(false)
    }
  }

  function updateProfile(patch: Partial<ProfileSettings>) {
    setProfileDraft((current) => ({ ...current, ...patch }))
    setProfileNotice('')
    setProfileError('')
  }

  async function saveNotificationChannels(event: SubmitEvent) {
    event.preventDefault()
    if (savingNotifications()) return
    const draft = notificationDraft()
    setSavingNotifications(true)
    setNotificationError('')
    try {
      await demoSettings.update('notificationChannels', (saved) => ({
        ...saved,
        ...draft,
      }))
      setNotificationDraft((current) => (current === draft ? {} : current))
      setNotificationNotice('Notification settings saved.')
    } catch {
      setNotificationError('Could not save the notification settings.')
    } finally {
      setSavingNotifications(false)
    }
  }

  function createToken(name: string) {
    const id = crypto.randomUUID()
    setTokens((current) => [
      {
        id,
        name,
        created: new Date().toISOString().slice(0, 10),
        lastUsed: '',
      },
      ...current,
    ])
    setSecurityNotice({
      section: tokensSection,
      message: 'Personal access token created.',
    })
    return `wfe_demo_${id}`
  }

  function revoke() {
    const item = pending()
    if (!item) return
    if (item.kind === 'session') {
      setSessions((current) => current.filter(({ id }) => id !== item.value.id))
      setSecurityNotice({
        section: sessionsSection,
        message: `${item.value.device} signed out.`,
      })
    } else {
      setTokens((current) => current.filter(({ id }) => id !== item.value.id))
      setSecurityNotice({
        section: tokensSection,
        message: `${item.value.name} revoked.`,
      })
    }
    setPending(undefined)
  }

  return (
    <BlockShell
      title={section()}
      fillTable={accountTableSections.includes(section())}
      header={
        <Show when={section() === tokensSection}>
          <Button tone="primary" onClick={() => setTokenOpen(true)}>
            Create token
          </Button>
        </Show>
      }
      contentOnly={props.contentOnly}
      visible={props.visible}
      navigationLabel="Account navigation"
      navigation={(controls) => (
        <BlockNavigation
          title="Account"
          icon="people"
          sections={accountSections}
          value={section()}
          onChange={setSelected}
          controls={controls}
        />
      )}
    >
      <Show when={section() === profileSection}>
        <DashboardPanel
          title="Your profile"
          titleAs="h3"
          headerEnd={
            <Show when={avatarUrl()}>
              {(src) => (
                <img src={src()} alt="Profile avatar" width={48} height={48} />
              )}
            </Show>
          }
        >
          <FormGrid
            as="form"
            columns={2}
            ref={nativeEvents<HTMLFormElement>({
              submit: (event) => void saveProfile(event),
            })}
            footer={
              <Button
                type="submit"
                tone="primary"
                disabled={!profile().name.trim() || savingProfile()}
              >
                Save profile
              </Button>
            }
          >
            <Field>
              <Label>Name</Label>
              <Input
                autocomplete="name"
                required
                value={profile().name}
                onInput={(event) =>
                  updateProfile({ name: event.currentTarget.value })
                }
              />
            </Field>
            <Field>
              <Label>Email</Label>
              <Input
                type="email"
                autocomplete="email"
                required
                value={profile().email}
                onInput={(event) =>
                  updateProfile({ email: event.currentTarget.value })
                }
              />
            </Field>
            <Field>
              <Label>Language</Label>
              <SelectField
                label="Language"
                choices={languages}
                value={profile().language}
                onValueChange={(language) => updateProfile({ language })}
              />
            </Field>
            <Field>
              <Label>Time zone</Label>
              <SelectField
                label="Time zone"
                choices={timeZones}
                value={profile().timeZone}
                onValueChange={(timeZone) => updateProfile({ timeZone })}
              />
            </Field>
            <FileInput
              label="Avatar image"
              accept="image/png,image/jpeg,image/webp"
              maxFileSize={5_000_000}
              files={avatar() ? [avatar()!] : []}
              onFilesChange={(files) => {
                setAvatar(files[0])
                setProfileNotice('')
              }}
            />
          </FormGrid>
          <BlockNotice message={profileNotice()} />
          <Show when={profileError()}>
            <InlineAlert tone="error" announce="assertive">
              {profileError()}
            </InlineAlert>
          </Show>
        </DashboardPanel>
      </Show>
      <Show when={section() === securitySection}>
        <DashboardPanel title="Sign-in security" titleAs="h3">
          <SummaryList
            items={[
              {
                label: 'Password',
                value: (
                  <Button onClick={() => setPasswordOpen(true)}>
                    Change password
                  </Button>
                ),
              },
              {
                label: 'Two-factor authentication',
                value: (
                  <Show
                    when={twoFactor()}
                    fallback={
                      <Button onClick={() => setTwoFactorOpen(true)}>
                        Set up two-factor authentication
                      </Button>
                    }
                  >
                    <Badge tone="success">Enabled</Badge>
                  </Show>
                ),
              },
            ]}
          />
          <BlockNotice message={currentNotice()} />
        </DashboardPanel>
        <PasswordSheet
          open={passwordOpen()}
          onOpenChange={setPasswordOpen}
          onChange={(current, next) => {
            if (password() !== current) return false
            setPassword(next)
            setSecurityNotice({
              section: securitySection,
              message: 'Password changed.',
            })
            return true
          }}
        />
        <TwoFactorSheet
          open={twoFactorOpen()}
          onOpenChange={setTwoFactorOpen}
          onVerified={() => {
            setTwoFactor(true)
            setSecurityNotice({
              section: securitySection,
              message: 'Two-factor authentication enabled.',
            })
          }}
        />
      </Show>
      <Show when={section() === sessionsSection}>
        <BlockTable
          table={sessionsTable}
          title={sessionsSection}
          minWidth="28rem"
          pageSizes={securityPageSizes}
          views={{ storage: views.storage['Active sessions'] }}
          filterMode="live"
          search={{ label: 'Search sessions' }}
          emptyResults={() => <EmptyState>No sessions match.</EmptyState>}
          toolbarActions={<BlockNotice message={currentNotice()} />}
          messages={{
            rowActions: (id) =>
              `Actions for ${sessionsTable.getRow(id).original?.device ?? id}`,
          }}
          rowActions={(row, { getMenuTrigger }) => {
            const session = row.original
            if (!session || session.current) return
            return [
              {
                label: 'Sign out',
                onSelect: () =>
                  askToRevoke(
                    { kind: 'session', value: session },
                    getMenuTrigger,
                  ),
              },
            ]
          }}
          formatValue={(value, column) => {
            if (column.id === 'active')
              return <BlockDate value={blockCellText(value)} time />
            if (column.id === 'status' && value)
              return <Badge>{blockCellText(value)}</Badge>
            return undefined
          }}
        />
      </Show>
      <Show when={section() === tokensSection}>
        <BlockTable
          table={tokensTable}
          title={tokensSection}
          minWidth="26rem"
          pageSizes={securityPageSizes}
          views={{ storage: views.storage['Personal access tokens'] }}
          filterMode="live"
          search={{ label: 'Search tokens' }}
          emptyResults={() => (
            <EmptyState>No matching personal access tokens.</EmptyState>
          )}
          toolbarActions={<BlockNotice message={currentNotice()} />}
          messages={{
            rowActions: (id) =>
              `Actions for ${tokensTable.getRow(id).original?.name ?? id}`,
          }}
          rowActions={(row, { getMenuTrigger }) => {
            const token = row.original
            if (!token) return
            return [
              {
                label: 'Revoke',
                onSelect: () =>
                  askToRevoke({ kind: 'token', value: token }, getMenuTrigger),
              },
            ]
          }}
          formatValue={(value, column) =>
            column.id === 'created' || column.id === 'lastUsed' ? (
              <BlockDate value={blockCellText(value)} empty="Never" />
            ) : undefined
          }
        />
        <TokenSheet
          open={tokenOpen()}
          onOpenChange={setTokenOpen}
          onCreate={createToken}
        />
      </Show>
      <Show when={accountTableSections.includes(section())}>
        <AlertDialog
          open={Boolean(pending())}
          onOpenChange={(open) => {
            if (!open) setPending(undefined)
          }}
        >
          <AlertDialog.Portal>
            <AlertDialog.Overlay />
            <AlertDialog.Content
              onCloseAutoFocus={(event) => {
                const target = confirmationTrigger?.() ?? confirmationFallback
                if (!target?.isConnected) return
                event.preventDefault()
                target.focus({ preventScroll: true })
              }}
            >
              <AlertDialog.Title>
                {pending()?.kind === 'session'
                  ? 'Sign out session?'
                  : 'Revoke token?'}
              </AlertDialog.Title>
              <AlertDialog.Description>
                {confirmation()}
              </AlertDialog.Description>
              <FormActions>
                <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
                <AlertDialog.Action onClick={revoke}>
                  {pending()?.kind === 'session'
                    ? 'Sign out session'
                    : 'Revoke token'}
                </AlertDialog.Action>
              </FormActions>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        </AlertDialog>
      </Show>
      <Show when={section() === notificationsSection}>
        <DashboardPanel
          title={notificationsSection}
          titleAs="h3"
          description="Choose where you receive each type of notification."
        >
          <FormGrid
            as="form"
            columns={2}
            ref={nativeEvents<HTMLFormElement>({
              submit: (event) => void saveNotificationChannels(event),
            })}
            footer={
              <Button
                type="submit"
                tone="primary"
                disabled={
                  savingNotifications() ||
                  !Object.keys(notificationDraft()).length
                }
              >
                Save notification settings
              </Button>
            }
          >
            <For each={notificationTypes}>
              {(event) => (
                <FieldGroup title={event}>
                  <For each={channels}>
                    {(channel) => {
                      const key = `${event}:${channel}`
                      return (
                        <SwitchField
                          label={channel}
                          checked={
                            notificationDraft()[key] ??
                            notificationChannels()?.[key] ??
                            (channel === 'In-app' || event === 'Security')
                          }
                          onChange={(checked) => {
                            setNotificationDraft((current) => ({
                              ...current,
                              [key]: checked,
                            }))
                            setNotificationNotice('')
                            setNotificationError('')
                          }}
                        />
                      )
                    }}
                  </For>
                </FieldGroup>
              )}
            </For>
          </FormGrid>
          <BlockNotice message={notificationNotice()} />
          <Show when={notificationError()}>
            <InlineAlert tone="error" announce="assertive">
              {notificationError()}
            </InlineAlert>
          </Show>
        </DashboardPanel>
      </Show>
    </BlockShell>
  )
}

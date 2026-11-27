import { createSignal, For, onCleanup, Show } from 'solid-js'
import {
  AlertDialog,
  Badge,
  Button,
  Dialog,
  EmptyState,
  Field,
  FieldError,
  FieldGroup,
  FileInput,
  FormActions,
  FormGrid,
  HelpText,
  Input,
  Label,
  SelectField,
  StepList,
  SwitchField,
} from '@wfe/components'
import { nativeEvents } from '@wfe/components/events'
import { DashboardGrid, DashboardPanel } from '@wfe/components/layout'
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
import { accountSections } from './blocksUserData'
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

type Profile = {
  name: string
  email: string
  language: string
  timeZone: string
  avatar?: File
}
type Token = (typeof personalTokens)[number]
type Session = (typeof userAccessSessions)[number]
type Revoke =
  { kind: 'session'; value: Session } | { kind: 'token'; value: Token }

function PasswordDialog(props: {
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
    <Dialog open={props.open} onOpenChange={changeOpen}>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content>
          <Dialog.Title>Change password</Dialog.Title>
          <Dialog.Description>
            Choose a new password with at least 12 characters.
          </Dialog.Description>
          <FormGrid
            as="form"
            ref={nativeEvents<HTMLFormElement>({ submit: save })}
            footer={
              <>
                <Button type="submit" tone="primary">
                  Save password
                </Button>
                <Dialog.CloseButton aria-label="Cancel">
                  Cancel
                </Dialog.CloseButton>
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}

function TwoFactorDialog(props: {
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
    <Dialog open={props.open} onOpenChange={changeOpen}>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content
          focusKey={step()}
          initialFocus={() => (step() === 'key' ? nextButton : codeField)}
        >
          <Dialog.Title>Set up two-factor authentication</Dialog.Title>
          <Dialog.Description>
            Add a code from an authenticator app when you sign in.
          </Dialog.Description>
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
                    <Dialog.CloseButton aria-label="Cancel">
                      Cancel
                    </Dialog.CloseButton>
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
                  <Dialog.CloseButton aria-label="Cancel">
                    Cancel
                  </Dialog.CloseButton>
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}

function TokenDialog(props: {
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
    <Dialog open={props.open} onOpenChange={changeOpen}>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content
          initialFocus={() => (value() ? tokenField : nameField)}
          focusKey={Boolean(value())}
        >
          <Dialog.Title>Create a personal access token</Dialog.Title>
          <Dialog.Description>
            Use a token to sign in from a script or tool.
          </Dialog.Description>
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
                    <Dialog.CloseButton aria-label="Cancel">
                      Cancel
                    </Dialog.CloseButton>
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
                  <Dialog.CloseButton aria-label="Done">
                    Done
                  </Dialog.CloseButton>
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}

export function BlocksUserAccount(
  props: UserPageProps & { section?: string } = {},
) {
  const requestedSection = new URLSearchParams(window.location.search).get(
    'item',
  )
  const [selected, setSelected] = createSignal<string>(
    requestedSection === 'security' ? accountSections[1] : accountSections[0],
  )
  const section = () => props.section ?? selected()
  const [profile, setProfile] = createSignal<Profile>(userMember)
  const [avatarUrl, setAvatarUrl] = createSignal('')
  let avatarObjectUrl = ''
  onCleanup(() => {
    if (avatarObjectUrl) URL.revokeObjectURL(avatarObjectUrl)
  })
  const [profileNotice, setProfileNotice] = createSignal('')
  const [securityNotice, setSecurityNotice] = createSignal('')
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
  const [enabled, setEnabled] = createSignal<Record<string, boolean>>({})

  const sessionsTable = createBlockTable(sessions, [
    { id: 'device', header: 'Device', accessorKey: 'device' },
    { id: 'active', header: 'Last active (UTC)', accessorKey: 'active' },
  ])
  const tokensTable = createBlockTable(tokens, [
    { id: 'name', header: 'Name', accessorKey: 'name' },
    { id: 'created', header: 'Created', accessorKey: 'created' },
    { id: 'lastUsed', header: 'Last used', accessorKey: 'lastUsed' },
  ])

  function saveProfile(event: SubmitEvent) {
    event.preventDefault()
    const current = profile()
    if (!current.name.trim()) return
    if (avatarObjectUrl) URL.revokeObjectURL(avatarObjectUrl)
    avatarObjectUrl = current.avatar ? URL.createObjectURL(current.avatar) : ''
    setAvatarUrl(avatarObjectUrl)
    setProfile({
      ...current,
      name: current.name.trim(),
      email: current.email.trim(),
    })
    setProfileNotice('Profile saved.')
  }

  function updateProfile(patch: Partial<Profile>) {
    setProfile((current) => ({ ...current, ...patch }))
    setProfileNotice('')
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
    setSecurityNotice('Personal access token created.')
    return `wfe_demo_${id}`
  }

  function revoke() {
    const item = pending()
    if (!item) return
    if (item.kind === 'session') {
      setSessions((current) => current.filter(({ id }) => id !== item.value.id))
      setSecurityNotice(`${item.value.device} signed out.`)
    } else {
      setTokens((current) => current.filter(({ id }) => id !== item.value.id))
      setSecurityNotice(`${item.value.name} revoked.`)
    }
    setPending(undefined)
  }

  return (
    <BlockShell
      title={section()}
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
      <Show when={section() === accountSections[0]}>
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
            ref={nativeEvents<HTMLFormElement>({ submit: saveProfile })}
            footer={
              <Button
                type="submit"
                tone="primary"
                disabled={!profile().name.trim()}
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
              files={profile().avatar ? [profile().avatar!] : []}
              onFilesChange={(files) => updateProfile({ avatar: files[0] })}
            />
          </FormGrid>
          <BlockNotice message={profileNotice()} />
        </DashboardPanel>
      </Show>
      <Show when={section() === accountSections[1]}>
        <DashboardGrid gap="layout" minPanelWidth="21rem">
          <DashboardPanel
            title="Password"
            titleAs="h3"
            description="Change the password for your account."
            footer={
              <Button onClick={() => setPasswordOpen(true)}>
                Change password
              </Button>
            }
          />
          <DashboardPanel
            title="Two-factor authentication"
            titleAs="h3"
            description="Use an authenticator code when you sign in."
            footer={
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
            }
          />
        </DashboardGrid>
        <DashboardGrid gap="layout" minPanelWidth="29rem">
          <BlockTable
            table={sessionsTable}
            title="Active sessions"
            layout="panel"
            minWidth="27rem"
            pageSizes={securityPageSizes}
            views={{ storage: views.storage['Active sessions'] }}
            filterMode="live"
            search={{ label: 'Search sessions' }}
            emptyResults={() => <EmptyState>No sessions match.</EmptyState>}
            renderRowActions={(row) => (
              <Show when={row.original} keyed>
                {(session) =>
                  session.current ? (
                    <Badge>Current session</Badge>
                  ) : (
                    <Button
                      aria-label={`Sign out ${session.device}`}
                      onClick={() =>
                        setPending({ kind: 'session', value: session })
                      }
                    >
                      Sign out
                    </Button>
                  )
                }
              </Show>
            )}
            formatValue={(value, column) =>
              column.id === 'active' ? (
                <BlockDate value={blockCellText(value)} time />
              ) : undefined
            }
          />
          <BlockTable
            table={tokensTable}
            title="Personal access tokens"
            layout="panel"
            minWidth="26rem"
            pageSizes={securityPageSizes}
            views={{ storage: views.storage['Personal access tokens'] }}
            filterMode="live"
            search={{ label: 'Search tokens' }}
            toolbarActions={
              <Button onClick={() => setTokenOpen(true)}>Create token</Button>
            }
            emptyResults={() => (
              <EmptyState>No matching personal access tokens.</EmptyState>
            )}
            renderRowActions={(row) => (
              <Show when={row.original} keyed>
                {(item) => (
                  <Button
                    aria-label={`Revoke ${item.name}`}
                    onClick={() => setPending({ kind: 'token', value: item })}
                  >
                    Revoke
                  </Button>
                )}
              </Show>
            )}
            formatValue={(value, column) =>
              column.id === 'created' || column.id === 'lastUsed' ? (
                <BlockDate value={blockCellText(value)} empty="Never" />
              ) : undefined
            }
          />
        </DashboardGrid>
        <BlockNotice message={securityNotice()} />
        <PasswordDialog
          open={passwordOpen()}
          onOpenChange={setPasswordOpen}
          onChange={(current, next) => {
            if (password() !== current) return false
            setPassword(next)
            setSecurityNotice('Password changed.')
            return true
          }}
        />
        <TwoFactorDialog
          open={twoFactorOpen()}
          onOpenChange={setTwoFactorOpen}
          onVerified={() => {
            setTwoFactor(true)
            setSecurityNotice('Two-factor authentication enabled.')
          }}
        />
        <TokenDialog
          open={tokenOpen()}
          onOpenChange={setTokenOpen}
          onCreate={createToken}
        />
        <AlertDialog
          open={Boolean(pending())}
          onOpenChange={(open) => {
            if (!open) setPending(undefined)
          }}
        >
          <AlertDialog.Portal>
            <AlertDialog.Overlay />
            <AlertDialog.Content>
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
      <Show when={section() === accountSections[2]}>
        <DashboardPanel
          title="Notification settings"
          titleAs="h3"
          description="Choose where you receive each type of notification. Changes apply immediately."
        >
          <FormGrid columns={2}>
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
                            enabled()[key] ??
                            (channel === 'In-app' || event === 'Security')
                          }
                          onChange={(checked) =>
                            setEnabled((current) => ({
                              ...current,
                              [key]: checked,
                            }))
                          }
                        />
                      )
                    }}
                  </For>
                </FieldGroup>
              )}
            </For>
          </FormGrid>
        </DashboardPanel>
      </Show>
    </BlockShell>
  )
}

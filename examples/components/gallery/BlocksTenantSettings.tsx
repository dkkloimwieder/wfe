import { createEffect, createSignal, Match, Show, Switch } from 'solid-js'
import {
  AlertDialog,
  Button,
  Field,
  FieldError,
  FieldGroup,
  FormActions,
  FormGrid,
  Input,
  Label,
  SelectField,
  SwitchField,
} from '@wfe/components'
import { nativeEvents } from '@wfe/components/events'
import { DashboardPanel } from '@wfe/components/layout'
import { BlockNavigation, BlockNotice, BlockShell } from './blocksParts'
import { choicesFor, sampleEmail, tenants, tenantSettings } from './blocksData'

export const settingsSections = [
  'General',
  'Domains',
  'Branding',
  'Security',
  'Danger zone',
]
const timeouts = choicesFor(['15', '30', '60'])

function invalidSetting(section: string, values: typeof tenantSettings) {
  switch (section) {
    case 'General':
      if (!values.name.trim()) return 'name'
      if (!sampleEmail.test(values.email.trim())) return 'email'
      break
    case 'Domains':
      if (!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(values.domain.trim()))
        return 'domain'
      break
    case 'Branding':
      if (!values.workspaceName.trim()) return 'workspaceName'
      if (!sampleEmail.test(values.helpEmail.trim())) return 'helpEmail'
      break
  }
  return undefined
}

export function BlocksTenantSettings(props: {
  contentOnly?: boolean
  visible?: boolean
  section?: string
  tenant?: (typeof tenants)[number]
}) {
  const tenant = () => props.tenant ?? tenants[0]
  const [selectedSection, setSection] = createSignal(settingsSections[0]!)
  const section = () => props.section ?? selectedSection()
  const [settings, setSettings] = createSignal<
    Partial<Record<string, typeof tenantSettings>>
  >({})
  const saved = () =>
    settings()[tenant().id] ?? {
      ...tenantSettings,
      name: tenant().name,
      domain: tenant().id + '.example.com',
      workspaceName: tenant().name + ' workspace',
    }
  const [edits, setEdits] = createSignal<typeof tenantSettings>()
  const draft = () => edits() ?? saved()
  const [error, setError] = createSignal<keyof typeof tenantSettings>()
  const [message, setMessage] = createSignal('')
  const [deletedTenants, setDeletedTenants] = createSignal<string[]>([])
  const deleted = () => deletedTenants().includes(tenant().id)
  const [confirm, setConfirm] = createSignal(false)

  createEffect(
    () => [section(), tenant().id],
    () => {
      setEdits(undefined)
      setError(undefined)
      setMessage('')
      setConfirm(false)
    },
  )

  function change<K extends keyof typeof tenantSettings>(
    key: K,
    value: (typeof tenantSettings)[K],
  ) {
    setEdits({ ...draft(), [key]: value })
    if (error() === key) setError(undefined)
  }

  function save(event: SubmitEvent) {
    event.preventDefault()
    const values = draft()
    const invalid = invalidSetting(section(), values)
    setError(invalid)
    if (invalid) return
    const next = {
      name: values.name.trim(),
      email: values.email.trim(),
      domain: values.domain.trim(),
      workspaceName: values.workspaceName.trim(),
      helpEmail: values.helpEmail.trim(),
      requireMfa: values.requireMfa,
      timeout: values.timeout,
    }
    setSettings((all) => ({ ...all, [tenant().id]: next }))
    setEdits(undefined)
    setMessage(`${section()} settings saved.`)
  }

  function textField(
    key: 'name' | 'email' | 'domain' | 'workspaceName' | 'helpEmail',
    label: string,
    hint: string,
    type?: 'email',
  ) {
    return (
      <Field required invalid={error() === key}>
        <Label>{label}</Label>
        <Input
          type={type}
          value={draft()[key]}
          onValueChange={(value) => change(key, value)}
        />
        <FieldError>{hint}</FieldError>
      </Field>
    )
  }

  return (
    <BlockShell
      title={section()}
      contentOnly={props.contentOnly}
      visible={props.visible}
      navigationLabel="Settings navigation"
      navigation={
        props.contentOnly || deleted()
          ? undefined
          : (controls) => (
              <BlockNavigation
                title="Settings sections"
                sections={settingsSections}
                value={section()}
                controls={controls}
                onChange={setSection}
              />
            )
      }
    >
      <BlockNotice
        message={deleted() ? `${saved().name} was deleted.` : undefined}
      />
      <Show when={!deleted()}>
        <BlockNotice message={message()} />
        <Switch>
          <Match when={section() === 'Danger zone'}>
            <DashboardPanel
              title={`Delete ${saved().name}`}
              titleAs="h3"
              description="Deleting the tenant removes its settings from this example."
              footer={
                <AlertDialog open={confirm()} onOpenChange={setConfirm}>
                  <AlertDialog.Trigger>Delete tenant</AlertDialog.Trigger>
                  <AlertDialog.Portal>
                    <AlertDialog.Overlay />
                    <AlertDialog.Content>
                      <AlertDialog.Title>
                        Delete {saved().name}?
                      </AlertDialog.Title>
                      <AlertDialog.Description>
                        The tenant will be removed from this example.
                      </AlertDialog.Description>
                      <FormActions>
                        <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
                        <AlertDialog.Action
                          onClick={() => {
                            setConfirm(false)
                            setDeletedTenants((all) => [...all, tenant().id])
                          }}
                        >
                          Delete tenant
                        </AlertDialog.Action>
                      </FormActions>
                    </AlertDialog.Content>
                  </AlertDialog.Portal>
                </AlertDialog>
              }
            />
          </Match>
          <Match when={section() !== 'Danger zone'}>
            <FormGrid
              as="form"
              novalidate
              ref={nativeEvents<HTMLFormElement>({ submit: save })}
              footer={
                <>
                  <Button type="submit" tone="primary">
                    Save settings
                  </Button>
                  <Button
                    onClick={() => {
                      setEdits(undefined)
                      setError(undefined)
                      setMessage('')
                    }}
                  >
                    Reset changes
                  </Button>
                </>
              }
            >
              <FieldGroup title={section()} columns={2}>
                <Switch>
                  <Match when={section() === 'General'}>
                    {textField('name', 'Tenant name', 'Enter a tenant name.')}
                    {textField(
                      'email',
                      'Contact email',
                      'Enter a valid email address.',
                      'email',
                    )}
                  </Match>
                  <Match when={section() === 'Domains'}>
                    {textField(
                      'domain',
                      'Sign-in domain',
                      'Enter a domain, such as northwind.example.com.',
                    )}
                  </Match>
                  <Match when={section() === 'Branding'}>
                    {textField(
                      'workspaceName',
                      'Workspace name',
                      'Enter a workspace name.',
                    )}
                    {textField(
                      'helpEmail',
                      'Support email',
                      'Enter a valid email address.',
                      'email',
                    )}
                  </Match>
                  <Match when={section() === 'Security'}>
                    <SwitchField
                      label="Require multi-factor authentication"
                      checked={draft().requireMfa}
                      onCheckedChange={(value: boolean) =>
                        change('requireMfa', value)
                      }
                    />
                    <SelectField
                      label="Session timeout (minutes)"
                      choices={timeouts}
                      value={draft().timeout}
                      onValueChange={(value) => change('timeout', value)}
                    />
                  </Match>
                </Switch>
              </FieldGroup>
            </FormGrid>
          </Match>
        </Switch>
      </Show>
    </BlockShell>
  )
}

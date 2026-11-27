import { createSignal, For, Match, Show, Switch } from 'solid-js'
import {
  Button,
  CheckboxField,
  Field,
  FieldError,
  FormGrid,
  Input,
  Label,
  StepList,
  SummaryList,
} from '@wfe/components'
import { nativeEvents } from '@wfe/components/events'
import { DashboardPanel } from '@wfe/components/layout'
import { memberInvitation } from './blocksData'
import { BlockNotice, BlockShell } from './blocksParts'
import type { UserPageProps } from './blocksUserData'

const steps = [
  { id: 'invitation', label: 'Invitation' },
  { id: 'account', label: 'Set up account' },
  { id: 'checklist', label: 'First-run checklist' },
]
const checklist = [
  { id: 'profile', label: 'Review your profile' },
  { id: 'security', label: 'Review your security settings' },
  { id: 'notifications', label: 'Choose your notification settings' },
]

export function BlocksUserInvitation(props: UserPageProps = {}) {
  const tenant = () => props.tenant ?? memberInvitation.tenant
  const [step, setStep] = createSignal('invitation')
  const [accepted, setAccepted] = createSignal(false)
  const [accountReady, setAccountReady] = createSignal(false)
  const [name, setName] = createSignal<string>(memberInvitation.name)
  const [password, setPassword] = createSignal('')
  const [confirmation, setConfirmation] = createSignal('')
  const [error, setError] = createSignal('')
  const [done, setDone] = createSignal<Record<string, boolean>>({})
  const [complete, setComplete] = createSignal(false)

  function saveAccount(event: SubmitEvent) {
    event.preventDefault()
    if (!name().trim()) return
    if (!accountReady() || password() || confirmation()) {
      if (password().length < 12) {
        setError('Use at least 12 characters for the password.')
        return
      }
      if (password() !== confirmation()) {
        setError('The passwords must match.')
        return
      }
    }
    setName(name().trim())
    setAccountReady(true)
    setPassword('')
    setConfirmation('')
    setError('')
    setStep('checklist')
  }

  return (
    <BlockShell
      title="Invitation and onboarding"
      contentOnly={props.contentOnly}
      visible={props.visible}
    >
      <DashboardPanel>
        <StepList
          steps={steps.map((item) => ({
            ...item,
            complete:
              item.id === 'invitation'
                ? accepted()
                : item.id === 'account'
                  ? accountReady()
                  : complete(),
            reachable:
              item.id === 'invitation' ||
              (item.id === 'account' ? accepted() : accountReady()),
          }))}
          current={step()}
          onStepChange={setStep}
          aria-label="Onboarding steps"
        />
      </DashboardPanel>
      <Switch>
        <Match when={step() === 'invitation'}>
          <DashboardPanel
            title={`Join ${tenant().name}`}
            titleAs="h3"
            description={`${memberInvitation.inviter} invited you to join ${tenant().name}.`}
            footer={
              <Button
                tone="primary"
                onClick={() => {
                  setAccepted(true)
                  setStep('account')
                }}
              >
                {accepted() ? 'Continue to account setup' : 'Accept invitation'}
              </Button>
            }
          >
            <SummaryList
              items={[
                { label: 'Email', value: memberInvitation.email },
                { label: 'Role', value: memberInvitation.role },
              ]}
            />
          </DashboardPanel>
        </Match>
        <Match when={step() === 'account'}>
          <DashboardPanel title="Set up your account" titleAs="h3">
            <FormGrid
              as="form"
              columns={2}
              ref={nativeEvents<HTMLFormElement>({ submit: saveAccount })}
              footer={
                <Button tone="primary" type="submit" disabled={!name().trim()}>
                  Continue to checklist
                </Button>
              }
            >
              <Field>
                <Label>Name</Label>
                <Input
                  autocomplete="name"
                  required
                  value={name()}
                  onInput={(event) => setName(event.currentTarget.value)}
                />
              </Field>
              <Field>
                <Label>Invitation email</Label>
                <Input
                  autocomplete="email"
                  type="email"
                  value={memberInvitation.email}
                  readonly
                />
              </Field>
              <Field>
                <Label>Password</Label>
                <Input
                  type="password"
                  autocomplete="new-password"
                  required={!accountReady()}
                  minlength={12}
                  value={password()}
                  onInput={(event) => setPassword(event.currentTarget.value)}
                />
              </Field>
              <Field invalid={Boolean(error())}>
                <Label>Confirm password</Label>
                <Input
                  type="password"
                  autocomplete="new-password"
                  required={!accountReady()}
                  minlength={12}
                  value={confirmation()}
                  onInput={(event) => {
                    setConfirmation(event.currentTarget.value)
                    setError('')
                  }}
                />
                <Show when={error()}>
                  <FieldError>{error()}</FieldError>
                </Show>
              </Field>
            </FormGrid>
          </DashboardPanel>
        </Match>
        <Match when={step() === 'checklist'}>
          <DashboardPanel
            title="First-run checklist"
            titleAs="h3"
            description="Check off each item when you are ready."
          >
            <FormGrid
              footer={
                <Button
                  tone="primary"
                  disabled={
                    complete() || !checklist.every(({ id }) => done()[id])
                  }
                  onClick={() => setComplete(true)}
                >
                  Finish onboarding
                </Button>
              }
            >
              <For each={checklist}>
                {({ id, label }) => (
                  <CheckboxField
                    label={label}
                    checked={Boolean(done()[id])}
                    disabled={complete()}
                    onChange={(checked) =>
                      setDone((current) => ({ ...current, [id]: checked }))
                    }
                  />
                )}
              </For>
            </FormGrid>
            <BlockNotice
              message={
                complete()
                  ? `You are ready to use ${tenant().name}.`
                  : undefined
              }
            />
          </DashboardPanel>
        </Match>
      </Switch>
    </BlockShell>
  )
}

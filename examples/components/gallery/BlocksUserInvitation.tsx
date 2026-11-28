import { createSignal, For, Match, Show, Switch } from 'solid-js'
import {
  Button,
  CheckboxField,
  Field,
  FieldError,
  FieldGroup,
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
  { id: 'invitation', label: 'Invitation', action: 'Accept invitation' },
  { id: 'account', label: 'Set up account', action: 'Continue to checklist' },
  {
    id: 'checklist',
    label: 'First-run checklist',
    action: 'Finish onboarding',
  },
] as const
const checklist = [
  { id: 'profile', label: 'Review your profile' },
  { id: 'security', label: 'Review your security settings' },
  { id: 'notifications', label: 'Choose your notification settings' },
]

export function BlocksUserInvitation(props: UserPageProps = {}) {
  const tenant = () => props.tenant ?? memberInvitation.tenant
  const [step, setStep] = createSignal(0)
  const [reached, setReached] = createSignal(0)
  const [name, setName] = createSignal<string>(memberInvitation.name)
  const [password, setPassword] = createSignal('')
  const [confirmation, setConfirmation] = createSignal('')
  const [error, setError] = createSignal('')
  const [done, setDone] = createSignal<Record<string, boolean>>({})
  const [complete, setComplete] = createSignal(false)
  const current = () => steps[step()]!
  const accountReady = () => reached() === steps.length - 1
  const allDone = () => checklist.every(({ id }) => done()[id])
  const canSubmit = () =>
    current().id === 'account'
      ? Boolean(name().trim())
      : current().id !== 'checklist' || allDone()
  let group: HTMLFieldSetElement | undefined

  function go(index: number) {
    if (index < 0 || index >= steps.length) return
    setError('')
    setStep(index)
    queueMicrotask(() => group?.focus({ preventScroll: true }))
  }

  function submit(event: SubmitEvent) {
    event.preventDefault()
    if (!canSubmit()) return
    if (current().id === 'checklist') {
      setComplete(true)
      return
    }
    if (current().id === 'account') {
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
      setPassword('')
      setConfirmation('')
    }
    const next = step() + 1
    setReached((previous) => Math.max(previous, next))
    go(next)
  }

  return (
    <BlockShell
      title="Invitation and onboarding"
      contentOnly={props.contentOnly}
      visible={props.visible}
    >
      <Show
        when={!complete()}
        fallback={
          <BlockNotice message={`You are ready to use ${tenant().name}.`} />
        }
      >
        <DashboardPanel>
          <StepList
            steps={steps.map(({ id, label }, index) => ({
              id,
              label,
              complete: index < reached(),
              reachable: index <= reached(),
            }))}
            current={current().id}
            onStepChange={(id) => go(steps.findIndex((item) => item.id === id))}
            aria-label="Onboarding steps"
          />
        </DashboardPanel>
        <FormGrid
          as="form"
          novalidate
          ref={nativeEvents<HTMLFormElement>({ submit })}
          footer={
            <>
              <Button disabled={step() === 0} onClick={() => go(step() - 1)}>
                Back
              </Button>
              <Button type="submit" tone="primary" disabled={!canSubmit()}>
                {current().action}
              </Button>
            </>
          }
        >
          <FieldGroup
            tabindex={-1}
            ref={(node) => {
              group = node
            }}
            title={`Step ${step() + 1} of ${steps.length} · ${current().label}`}
          >
            <Switch>
              <Match when={current().id === 'invitation'}>
                <p>
                  {memberInvitation.inviter} invited you to join {tenant().name}
                  .
                </p>
                <SummaryList
                  items={[
                    { label: 'Email', value: memberInvitation.email },
                    { label: 'Role', value: memberInvitation.role },
                  ]}
                />
              </Match>
              <Match when={current().id === 'account'}>
                <Field required>
                  <Label>Name</Label>
                  <Input
                    autocomplete="name"
                    value={name()}
                    onValueChange={setName}
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
                <Field required={!accountReady()}>
                  <Label>Password</Label>
                  <Input
                    type="password"
                    autocomplete="new-password"
                    minlength={12}
                    value={password()}
                    onValueChange={setPassword}
                  />
                </Field>
                <Field required={!accountReady()} invalid={Boolean(error())}>
                  <Label>Confirm password</Label>
                  <Input
                    type="password"
                    autocomplete="new-password"
                    minlength={12}
                    value={confirmation()}
                    onValueChange={(value) => {
                      setConfirmation(value)
                      setError('')
                    }}
                  />
                  <FieldError>{error()}</FieldError>
                </Field>
              </Match>
              <Match when={current().id === 'checklist'}>
                <For each={checklist}>
                  {({ id, label }) => (
                    <CheckboxField
                      label={label}
                      checked={Boolean(done()[id])}
                      onChange={(checked) =>
                        setDone((previous) => ({ ...previous, [id]: checked }))
                      }
                    />
                  )}
                </For>
              </Match>
            </Switch>
          </FieldGroup>
        </FormGrid>
      </Show>
    </BlockShell>
  )
}

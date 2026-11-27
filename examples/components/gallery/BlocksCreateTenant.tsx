import { createSignal, For, Match, Show, Switch } from 'solid-js'
import {
  Button,
  CheckboxField,
  Field,
  FieldError,
  FieldGroup,
  FormGrid,
  HelpText,
  InlineAlert,
  Input,
  Label,
  SelectField,
  StepList,
  SummaryList,
  Textarea,
} from '@wfe/components'
import { DashboardPanel } from '@wfe/components/layout'
import { nativeEvents } from '@wfe/components/events'
import { BlockNotice, BlockShell } from './blocksParts'
import {
  applications,
  billingPlans,
  choicesFor,
  sampleEmail,
  tenants,
} from './blocksData'

export const tenantSetupSteps = [
  'Details',
  'Plan',
  'Applications',
  'Invite admins',
  'Review',
]
const plans = choicesFor(billingPlans.map(({ name }) => name))
const lastStep = tenantSetupSteps.length - 1
type SetupField = 'name' | 'slug' | 'applications' | 'invites'

export function BlocksCreateTenant(props: {
  contentOnly?: boolean
  visible?: boolean
  section?: string
  onSectionChange?: (value: string) => void
}) {
  const [selectedStep, setStep] = createSignal(0)
  const step = () =>
    props.section ? tenantSetupSteps.indexOf(props.section) : selectedStep()
  const [name, setName] = createSignal('')
  const [slug, setSlug] = createSignal('')
  const [plan, setPlan] = createSignal('Starter')
  const [apps, setApps] = createSignal<string[]>([])
  const [invites, setInvites] = createSignal('')
  const [error, setError] = createSignal<{
    field: SetupField
    message: string
  }>()
  const [finished, setFinished] = createSignal(false)
  const emailList = () => [
    ...new Set(
      invites()
        .split(/[\n,]/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  ]
  const stepName = () => tenantSetupSteps[step()]!
  const invalid = (field: SetupField) => error()?.field === field
  const message = (field: SetupField) =>
    invalid(field) ? error()?.message : undefined
  let group: HTMLFieldSetElement | undefined

  function go(next: number) {
    setError(undefined)
    if (props.onSectionChange) props.onSectionChange(tenantSetupSteps[next]!)
    else setStep(next)
    queueMicrotask(() => group?.focus({ preventScroll: true }))
  }

  function validate(section: string) {
    switch (section) {
      case 'Details':
        if (!name().trim())
          return { field: 'name', message: 'Enter a tenant name.' } as const
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug().trim()))
          return {
            field: 'slug',
            message:
              'Use lowercase letters, numbers, and single hyphens for the tenant ID.',
          } as const
        if (tenants.some((tenant) => tenant.id === slug().trim()))
          return {
            field: 'slug',
            message: 'This tenant ID is already in use.',
          } as const
        break
      case 'Applications':
        if (!apps().length)
          return {
            field: 'applications',
            message: 'Select at least one application.',
          } as const
        break
      case 'Invite admins':
        if (
          !emailList().length ||
          emailList().some((email) => !sampleEmail.test(email))
        )
          return {
            field: 'invites',
            message: 'Enter at least one valid email address.',
          } as const
        break
    }
    return undefined
  }

  function submit(event: SubmitEvent) {
    event.preventDefault()
    if (step() === lastStep) {
      for (const [index, name] of tenantSetupSteps.entries()) {
        const problem = validate(name)
        if (problem) {
          go(index)
          setError(problem)
          return
        }
      }
      setFinished(true)
      return
    }
    const problem = validate(stepName())
    if (problem) setError(problem)
    else go(step() + 1)
  }

  return (
    <BlockShell
      title="Create tenant"
      contentOnly={props.contentOnly}
      visible={props.visible}
    >
      <Show
        when={!finished()}
        fallback={
          <BlockNotice
            message={`Created ${name().trim()} and invited ${emailList().join(', ')}.`}
          />
        }
      >
        <DashboardPanel>
          <StepList
            steps={tenantSetupSteps.map((label, index) => ({
              id: label,
              label,
              complete: index < step() && !validate(label),
              reachable: true,
            }))}
            current={stepName()}
            onStepChange={(name) => go(tenantSetupSteps.indexOf(name))}
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
              <Button type="submit" tone="primary">
                {step() === lastStep ? 'Finish' : 'Next'}
              </Button>
            </>
          }
        >
          <FieldGroup
            tabindex={-1}
            ref={(node) => {
              group = node
            }}
            title={`Step ${step() + 1} of ${tenantSetupSteps.length} · ${stepName()}`}
          >
            <Switch>
              <Match when={stepName() === 'Details'}>
                <Field required invalid={invalid('name')}>
                  <Label>Tenant name</Label>
                  <Input
                    value={name()}
                    onValueChange={(value) => {
                      setName(value)
                      setError(undefined)
                    }}
                  />
                  <FieldError>{message('name')}</FieldError>
                </Field>
                <Field required invalid={invalid('slug')}>
                  <Label>Tenant ID</Label>
                  <Input
                    value={slug()}
                    onValueChange={(value) => {
                      setSlug(value)
                      setError(undefined)
                    }}
                  />
                  <FieldError>{message('slug')}</FieldError>
                </Field>
              </Match>
              <Match when={stepName() === 'Plan'}>
                <SelectField
                  label="Billing plan"
                  choices={plans}
                  value={plan()}
                  onValueChange={setPlan}
                />
              </Match>
              <Match when={stepName() === 'Applications'}>
                <For each={applications}>
                  {({ name }) => (
                    <CheckboxField
                      label={name}
                      checked={apps().includes(name)}
                      onCheckedChange={(checked) => {
                        setApps((items) =>
                          checked
                            ? [...items, name]
                            : items.filter((item) => item !== name),
                        )
                        setError(undefined)
                      }}
                    />
                  )}
                </For>
                <Show when={message('applications')}>
                  <InlineAlert tone="error" announce="polite">
                    {message('applications')}
                  </InlineAlert>
                </Show>
              </Match>
              <Match when={stepName() === 'Invite admins'}>
                <Field required invalid={invalid('invites')}>
                  <Label>Administrator emails</Label>
                  <Textarea
                    value={invites()}
                    placeholder="alex.morgan@example.com"
                    onValueChange={(value) => {
                      setInvites(value)
                      setError(undefined)
                    }}
                  />
                  <HelpText>
                    Separate addresses with commas or line breaks.
                  </HelpText>
                  <FieldError>{message('invites')}</FieldError>
                </Field>
              </Match>
              <Match when={stepName() === 'Review'}>
                <SummaryList
                  items={[
                    {
                      label: 'Tenant',
                      value: `${name().trim()} (${slug().trim()})`,
                    },
                    { label: 'Plan', value: plan() },
                    { label: 'Applications', value: apps().join(', ') },
                    { label: 'Admins', value: emailList().join(', ') },
                  ]}
                />
              </Match>
            </Switch>
          </FieldGroup>
        </FormGrid>
      </Show>
    </BlockShell>
  )
}

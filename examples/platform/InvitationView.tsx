import { Show } from 'solid-js'
import { Button, Combobox, InlineAlert, Input } from '@wfe/components'
import { DashboardPanel } from '@wfe/components/layout'
import { FormView } from '@wfe/generator'
import type { CustomFieldProps, FormDescription } from '@wfe/generator'
import type {
  InvitationChoice,
  InvitationValues,
  TargetRow,
} from './invitation-application'
import type { createPlatformApplication } from './application'
import type { PlatformRoute } from './route'

export function InvitationView(props: {
  app: ReturnType<typeof createPlatformApplication>
  navigate: (route: PlatformRoute) => void
}) {
  const invitation = props.app.invitation
  const description = {
    id: 'platform-invitation',
    fields: [
      {
        field: 'displayName',
        label: 'Display name',
        control: 'text',
        required: true,
      },
      { field: 'email', label: 'Email', control: 'text', required: true },
      {
        field: 'orgAdmin',
        label: 'Organization administrator',
        control: 'select',
      },
      {
        field: 'memberships',
        label: 'Environment memberships',
        control: 'repeat',
        fields: [
          {
            field: 'target',
            label: 'Project / environment',
            control: 'custom',
            required: true,
          },
        ],
      },
      {
        field: 'projectAdmins',
        label: 'Project administration',
        control: 'repeat',
        fields: [
          {
            field: 'target',
            label: 'Project',
            control: 'custom',
            required: true,
          },
        ],
      },
    ],
    submit: { id: 'invite', label: 'Create sample invitation' },
    actions: [{ id: 'back', label: 'Back to users' }],
  } as const satisfies FormDescription<InvitationValues>
  const picker =
    (choices: () => InvitationChoice[]) =>
    (field: CustomFieldProps<TargetRow, 'target'>) => (
      <Combobox<InvitationChoice>
        required
        options={choices()}
        value={choices().find((choice) => choice.id === field.value) ?? null}
        onChange={(choice) => field.onValueChange(choice?.id ?? '')}
        optionValue="id"
        optionTextValue="label"
        optionLabel="label"
        disabled={field.disabled}
        readOnly={field.readOnly}
        itemComponent={(props) => (
          <Combobox.Item item={props.item}>
            <Combobox.ItemLabel>{props.item.rawValue.label}</Combobox.ItemLabel>
            <Combobox.ItemIndicator />
          </Combobox.Item>
        )}
      >
        <Combobox.Control>
          <Combobox.Input as={Input} id={field.id} />
          <Combobox.Trigger aria-label="Show sample targets">
            <Combobox.Icon />
          </Combobox.Trigger>
        </Combobox.Control>
        <Combobox.Portal>
          <Combobox.Content>
            <Combobox.Listbox />
          </Combobox.Content>
        </Combobox.Portal>
      </Combobox>
    )
  const membershipPicker = picker(invitation.memberships),
    projectPicker = picker(invitation.projects)
  return (
    <Show
      when={
        props.app.route().screen === 'invite' &&
        !props.app.session().loading &&
        !props.app.session().error
      }
    >
      <DashboardPanel fill class="platform-details platform-form-page">
        <div class="platform-mockup-form">
          <h2 data-ui-text="system">Invite a user</h2>
          <p>
            Interactive mockup. Changes affect sample data only. No email is
            sent.
          </p>
          <Show when={invitation.completed()}>
            <InlineAlert announce="polite">
              {invitation.completed()}
            </InlineAlert>
          </Show>
          <Show when={invitation.state().error}>
            <InlineAlert tone="error" announce="assertive">
              {invitation.state().error}
            </InlineAlert>
            <Button onClick={() => void invitation.load()}>
              Refresh sample targets
            </Button>
          </Show>
          <FormView
            description={description}
            bindings={{
              form: invitation.form,
              status: invitation.state,
              disabled: () =>
                !invitation.allowed() ||
                invitation.state().loading ||
                Boolean(invitation.state().error),
              choices: {
                orgAdmin: () => [
                  { value: 'unspecified', label: 'Unspecified' },
                  {
                    value: 'yes',
                    label: 'Yes',
                    disabled: !props.app.authority()?.orgAdmin,
                  },
                  { value: 'no', label: 'No' },
                ],
              },
              repeated: {
                memberships: {
                  rowKey: (row) => row.key,
                  createRow: invitation.createRow,
                  fields: { target: membershipPicker },
                },
                projectAdmins: {
                  rowKey: (row) => row.key,
                  createRow: invitation.createRow,
                  fields: { target: projectPicker },
                },
              },
              actions: {
                back: { run: () => props.navigate({ screen: 'users' }) },
              },
            }}
          />
        </div>
      </DashboardPanel>
    </Show>
  )
}

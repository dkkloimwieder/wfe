import { createSignal, onCleanup, untrack } from 'solid-js'
import { createForm } from '@wfe/form'
import type { FormErrors, FormSnapshot } from '@wfe/form'
import type { Authority, createPlatformClient } from './provider'
import type { UserInviteRequestValue } from './snapshot/client/user'
import { accessFailure } from './access-application'

export type TargetRow = { key: string; target: string }
export type InvitationValues = {
  displayName: string
  email: string
  orgAdmin: string
  memberships: readonly TargetRow[]
  projectAdmins: readonly TargetRow[]
}
export type InvitationChoice = {
  id: string
  label: string
  project: string
  env?: string
}
const empty = (): InvitationValues => ({
  displayName: '',
  email: '',
  orgAdmin: 'unspecified',
  memberships: [],
  projectAdmins: [],
})

/** Demo projection only. Choice IDs and row keys never enter the captured request. */
export function invitationRequest(
  values: FormSnapshot<InvitationValues>,
  memberships: readonly InvitationChoice[],
  projects: readonly InvitationChoice[],
): UserInviteRequestValue {
  const resolve = (id: string, choices: readonly InvitationChoice[]) => {
    const choice = choices.find((choice) => choice.id === id)
    if (!choice) throw new Error('Choose a current sample target.')
    return choice
  }
  if (!['unspecified', 'yes', 'no'].includes(values.orgAdmin))
    throw new Error('Choose an organization administration value.')
  return {
    displayName: values.displayName,
    email: values.email,
    orgAdmin:
      values.orgAdmin === 'unspecified' ? null : values.orgAdmin === 'yes',
    memberships: values.memberships.map((row) => {
      const choice = resolve(row.target, memberships)
      if (choice.env === undefined)
        throw new Error('Choose a sample environment.')
      return { project: choice.project, env: choice.env }
    }),
    projectAdmins: values.projectAdmins.map(
      (row) => resolve(row.target, projects).project,
    ),
  }
}

export function createInvitationApplication(
  client: ReturnType<typeof createPlatformClient>,
  authority: () => Authority | undefined,
  availableProjects: () => readonly { name: string }[],
) {
  const [values, setValues] = createSignal<InvitationValues>(empty())
  const [memberships, setMemberships] = createSignal<InvitationChoice[]>([])
  const [projects, setProjects] = createSignal<InvitationChoice[]>([])
  const [state, setState] = createSignal<{ loading: boolean; error?: string }>({
    loading: false,
  })
  const [completed, setCompleted] = createSignal('')
  let alive = true,
    sequence = 0,
    rowId = 0
  let abort: AbortController | undefined
  const allowed = () =>
    Boolean(
      authority()?.orgAdmin ||
      authority()?.projects.some((p) => p.projectAdmin),
    )
  function validate(
    snapshot: FormSnapshot<InvitationValues>,
  ): FormErrors<InvitationValues> {
    const fields: Partial<Record<keyof InvitationValues, string>> = {}
    if (!snapshot.displayName.trim())
      fields.displayName = 'Enter a display name for the sample invitation.'
    if (!snapshot.email.trim())
      fields.email = 'Enter an email for the sample invitation.'
    if (!['unspecified', 'yes', 'no'].includes(snapshot.orgAdmin))
      fields.orgAdmin = 'Choose a listed value.'
    if (!authority()?.orgAdmin && snapshot.orgAdmin === 'yes')
      fields.orgAdmin =
        'This sample session cannot select organization administration.'
    const rows = (
      items: readonly TargetRow[],
      choices: readonly InvitationChoice[],
    ) =>
      Object.fromEntries(
        items
          .filter((row) => !choices.some((choice) => choice.id === row.target))
          .map((row) => [
            row.key,
            { fields: { target: 'Choose a current sample target.' } },
          ]),
      )
    return {
      fields,
      rows: {
        memberships: rows(snapshot.memberships, memberships()),
        projectAdmins: rows(snapshot.projectAdmins, projects()),
      },
    }
  }
  const form = createForm<InvitationValues>({
    values,
    defaults: empty,
    onValuesChange: setValues,
    validate,
    async onSubmit(snapshot, context) {
      setCompleted('')
      if (!allowed() || state().loading || state().error)
        return {
          ok: false,
          errors: {
            form: 'Sample choices are unavailable. Refresh the invitation.',
          },
        }
      const outcome = await client.invite(
        invitationRequest(snapshot, memberships(), projects()),
        crypto.randomUUID(),
        context.signal,
      )
      if (!alive || context.signal.aborted)
        return {
          ok: false,
          errors: { form: 'The demo stopped waiting for this response.' },
        }
      if (outcome.status !== 'completed')
        return { ok: false, errors: { form: accessFailure(outcome) } }
      setCompleted('Sample invitation completed. No email was sent.')
      return { ok: true }
    },
  })
  async function load(access = untrack(authority)) {
    const attempt = ++sequence
    abort?.abort()
    abort = new AbortController()
    const signal = abort.signal
    setState({ loading: true })
    setProjects([])
    setMemberships([])
    if (!access?.orgAdmin && !access?.projects.some((p) => p.projectAdmin)) {
      setState({
        loading: false,
        error: 'This sample session has no invitation targets.',
      })
      return
    }
    const names = availableProjects().filter(
      (row) =>
        access?.orgAdmin ||
        access?.projects.some((p) => p.project === row.name && p.projectAdmin),
    )
    const replies = await Promise.all(
      names.map(async (row) => ({
        name: row.name,
        outcome: await client.environments(row.name, signal),
      })),
    )
    if (!alive || signal.aborted || attempt !== sequence) return
    const error = replies.find((reply) => reply.outcome.status !== 'completed')
    if (error && error.outcome.status !== 'completed') {
      setState({ loading: false, error: accessFailure(error.outcome) })
      return
    }
    setProjects(
      names.map((row) => ({
        id: JSON.stringify([row.name]),
        label: row.name,
        project: row.name,
      })),
    )
    setMemberships(
      replies.flatMap((reply) =>
        reply.outcome.status === 'completed'
          ? reply.outcome.value.environments.map(({ name: env }) => ({
              id: JSON.stringify([reply.name, env]),
              label: `${reply.name} / ${env}`,
              project: reply.name,
              env,
            }))
          : [],
      ),
    )
    setState({ loading: false })
  }
  function leave() {
    sequence++
    abort?.abort()
    form.cancel()
  }
  function reset() {
    leave()
    form.reset()
    setCompleted('')
  }
  onCleanup(() => {
    alive = false
    sequence++
    abort?.abort()
  })
  return {
    form,
    memberships,
    projects,
    state,
    completed,
    allowed,
    load,
    leave,
    reset,
    createRow: (): TargetRow => ({ key: `sample-${++rowId}`, target: '' }),
    snapshot: () => untrack(() => values()),
  }
}

import { Show } from 'solid-js'
import { InlineAlert } from '@wfe/components'
import { DashboardPanel } from '@wfe/components/layout'
import { FormView } from '@wfe/generator'
import type { FormDescription } from '@wfe/generator'
import type { ProjectValues } from './provider'
import type {
  PlatformApplication,
  PlatformHref,
  PlatformFollow,
} from './view-types'
import { metadataFormFields } from './metadata-description'
import projectMetadata from './snapshot/metadata/project/create.operation.json'
import projectInput from './snapshot/metadata/project/create.input.json'

export function CreateProjectView(props: {
  app: PlatformApplication
  href: PlatformHref
  follow: PlatformFollow
}) {
  const app = props.app
  const href: PlatformHref = (route) => props.href(route)
  const follow: PlatformFollow = (route, close) => props.follow(route, close)
  const formDescription = {
    id: 'platform-create-project',
    fields: metadataFormFields(
      projectInput,
      [
        {
          path: 'value.project',
          description: {
            field: 'project',
            control: 'text',
            required: true,
            help: 'Use 1 to 40 UTF-8 bytes. Surrounding whitespace is removed by the server.',
          },
        },
      ],
      ['request_id'],
    ),
    submit: { id: 'create', label: projectMetadata.label },
  } as const satisfies FormDescription<ProjectValues>
  return (
    <DashboardPanel fill class="platform-details platform-form-page">
      <h2 data-ui-text="system">{projectMetadata.label}</h2>
      <Show
        when={app.authority()?.orgAdmin}
        fallback={
          <InlineAlert announce="assertive" tone="error">
            Access was refused for this operation.
          </InlineAlert>
        }
      >
        <Show
          when={!app.created()}
          fallback={
            <>
              <p role="status">Project created: {app.created()}</p>
              <a
                data-ui-text="system"
                href={href({
                  screen: 'project',
                  project: app.created(),
                })}
                onClick={follow({
                  screen: 'project',
                  project: app.created(),
                })}
              >
                Open project
              </a>
            </>
          }
        >
          <FormView
            description={formDescription}
            bindings={{ form: app.form }}
          />
        </Show>
      </Show>
      <a
        data-ui-text="system"
        href={href({ screen: 'projects' })}
        onClick={follow({ screen: 'projects' })}
      >
        {app.form.pending ? 'Stop waiting' : 'Back to projects'}
      </a>
    </DashboardPanel>
  )
}

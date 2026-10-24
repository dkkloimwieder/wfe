import { For, Show } from 'solid-js'
import { Button, InlineAlert, ValueDisplay } from '@wfe/components'
import { DashboardPanel } from '@wfe/components/layout'
import type { PlatformApplication, PlatformNavigate } from './view-types'

export function EnvironmentView(props: {
  app: PlatformApplication
  navigate: PlatformNavigate
  title: string
  routeProject: string
  routeEnvironment: string
}) {
  const app = props.app
  const navigate: PlatformNavigate = (route) => props.navigate(route)
  const title = () => props.title
  const routeProject = () => props.routeProject
  const routeEnvironment = () => props.routeEnvironment
  return (
    <DashboardPanel class="platform-details">
      <h2>{title()}</h2>
      <Button onClick={() => void app.refresh()}>Refresh environment</Button>
      <div class="platform-inline-actions">
        <Button
          onClick={() =>
            navigate({
              screen: 'app-users',
              project: routeProject(),
              env: routeEnvironment(),
            })
          }
        >
          Application users
        </Button>
        <Button
          onClick={() =>
            navigate({
              screen: 'app-roles',
              project: routeProject(),
              env: routeEnvironment(),
            })
          }
        >
          Application roles
        </Button>
      </div>
      <Show when={app.detail().loading}>
        <p role="status" data-ui-text="system">
          Loading environment status
        </p>
      </Show>
      <Show when={app.detail().error}>
        <InlineAlert announce="assertive" tone="error">
          {app.detail().error}
        </InlineAlert>
      </Show>
      <Show when={app.status()}>
        {(status) => (
          <>
            <dl class="platform-values">
              <div>
                <dt data-ui-text="system">Release digest</dt>
                <dd>{status().digest ?? 'Unavailable'}</dd>
              </div>
              <For
                each={[
                  {
                    label: 'Replicas',
                    value: status().rollout.replicas,
                  },
                  {
                    label: 'Updated replicas',
                    value: status().rollout.updatedReplicas,
                  },
                  {
                    label: 'Ready replicas',
                    value: status().rollout.readyReplicas,
                  },
                  {
                    label: 'Available replicas',
                    value: status().rollout.availableReplicas,
                  },
                ]}
              >
                {(entry) => (
                  <div>
                    <dt data-ui-text="system">{entry.label}</dt>
                    <dd>
                      <ValueDisplay
                        value={entry.value}
                        format="number-grouped"
                      />
                    </dd>
                  </div>
                )}
              </For>
            </dl>
            <h3 data-ui-text="system">Workloads</h3>
            <Show
              when={status().workloads.length}
              fallback={<p>No workloads were reported.</p>}
            >
              <For each={status().workloads}>
                {(workload) => (
                  <section>
                    <h4>{workload.name}</h4>
                    <dl class="platform-values">
                      <For each={workload.conditions}>
                        {(condition) => (
                          <div>
                            <dt>{condition.type}</dt>
                            <dd>{condition.status}</dd>
                          </div>
                        )}
                      </For>
                    </dl>
                  </section>
                )}
              </For>
            </Show>
            <h3 data-ui-text="system">Live releases</h3>
            <Show
              when={status().live.length}
              fallback={<p>No live releases were reported.</p>}
            >
              <For each={status().live}>
                {(release) => (
                  <dl class="platform-values">
                    <div>
                      <dt data-ui-text="system">Digest</dt>
                      <dd>{release.digest}</dd>
                    </div>
                    <div>
                      <dt data-ui-text="system">Pods</dt>
                      <dd>
                        <ValueDisplay
                          value={release.pods}
                          format="number-grouped"
                        />
                      </dd>
                    </div>
                  </dl>
                )}
              </For>
            </Show>
          </>
        )}
      </Show>
    </DashboardPanel>
  )
}

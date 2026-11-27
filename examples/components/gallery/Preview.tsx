import { lazy, Loading, onCleanup, untrack } from 'solid-js'
import { Dynamic } from '@solidjs/web'
import { InlineAlert } from '@wfe/components'
import { DefaultAppearance } from '../../shared/appearance/DefaultAppearance'
import { entryFor, galleryThemeOptions } from './catalog'
import { useGalleryAppearance } from './galleryAppearance'
import type { GalleryAppearance } from './galleryAppearance'
import type { GalleryId, GalleryState } from './catalog'
import { blockViews } from './BlocksPreviews'
import { UserBlockAppearance, UserViewSettings } from './BlocksUserState'

const ComponentPreview = lazy(() =>
  import('./ComponentPreviews').then(({ ComponentPreview }) => ({
    default: ComponentPreview,
  })),
)

const fillExamples = new Set<GalleryId>([
  'calendar-ranges',
  'column-controls',
  'dashboard-layout',
  'gantt',
  'kanban',
  'pagination',
  'subtables',
  'table',
])

export function GalleryExample(props: {
  id: GalleryId
  state: GalleryState
  appearance: GalleryAppearance
  onNavigate?: (id: GalleryId) => void
}) {
  // Gallery remounts this owner when its example ID changes.
  const entry = entryFor(untrack(() => props.id))
  const id = entry.id
  const example = () =>
    Object.hasOwn(blockViews, id) ? (
      <Dynamic component={blockViews[id as keyof typeof blockViews]} />
    ) : (
      <ComponentPreview
        id={id as Exclude<GalleryId, keyof typeof blockViews>}
        state={props.state}
        onNavigate={props.onNavigate}
      />
    )

  return (
    <div
      class="gallery-preview"
      data-gallery-fill={
        entry.group === 'Blocks' || fillExamples.has(id) ? '' : undefined
      }
      data-gallery-entry={
        id === 'entry' || id === 'blocks-integrations' ? '' : undefined
      }
    >
      <div
        class={
          entry.group === 'Blocks' ||
          entry.id === 'gantt' ||
          entry.id === 'kanban' ||
          entry.id === 'entry' ||
          entry.id === 'dashboard-layout' ||
          entry.id === 'everything' ||
          entry.id === 'table' ||
          entry.id === 'column-controls' ||
          entry.id === 'pagination' ||
          entry.id === 'subtables'
            ? 'gallery-example-unframed'
            : 'gallery-example-panel'
        }
        data-gallery-group={entry.group}
      >
        <Loading
          fallback={
            entry.group === 'Blocks' ? (
              <InlineAlert announce="polite" aria-label="Example loading">
                Loading example
              </InlineAlert>
            ) : (
              <p role="status" aria-label="Example loading">
                LOADING EXAMPLE
              </p>
            )
          }
        >
          {id === 'blocks-user-preferences' || id === 'blocks-admin-app' ? (
            <UserBlockAppearance
              route={props.appearance.route}
              mode={props.appearance.mode}
              choice={props.appearance.choice}
              setChoice={(value) => void props.appearance.setChoice(value)}
              failure={props.appearance.failure}
            >
              {example()}
            </UserBlockAppearance>
          ) : (
            example()
          )}
        </Loading>
      </div>
    </div>
  )
}

export function GalleryPreview() {
  const appearance = useGalleryAppearance()
  const { route } = appearance
  // The standalone preview owns a fixed example ID for this document.
  const id = untrack(() => route().id)
  const oldTitle = document.title
  document.title = `${entryFor(id).label} · Component preview`
  onCleanup(() => {
    document.title = oldTitle
  })
  return (
    <DefaultAppearance
      options={galleryThemeOptions(route())}
      preset={route().preset}
      mode={appearance.mode()}
    >
      <UserViewSettings>
        <GalleryExample id={id} state={route().state} appearance={appearance} />
      </UserViewSettings>
    </DefaultAppearance>
  )
}

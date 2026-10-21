import { Show, createSignal } from 'solid-js'
import { Icon, IconButton } from '@wfe/components'
import { PagedRecords } from '../../shared/controls/PagedRecords'

export function PaginationExample() {
  const [message, setMessage] = createSignal('')
  return (
    <div class="gallery-table">
      <PagedRecords
        embedded
        toolbarActions={
          <>
            <IconButton
              aria-label="Create record"
              title="Create record"
              onClick={() =>
                setMessage('Create requested by the application mock.')
              }
            >
              <Icon name="form" />
            </IconButton>
            <IconButton
              aria-label="Invite member"
              title="Invite member"
              onClick={() =>
                setMessage('Invite requested by the application mock.')
              }
            >
              <Icon name="people" />
            </IconButton>
          </>
        }
      />
      <Show when={message()}>
        <output
          class="ui-help-text"
          style={{
            margin: 0,
            padding: 'var(--ui-gap)',
            background: 'var(--ui-surface)',
          }}
        >
          {message()}
        </output>
      </Show>
    </div>
  )
}

import { createSignal } from 'solid-js'
import { Button, Input } from '@wfe/components'
import { DashboardShell } from '@wfe/components/layout'
import { TableWorkspace } from '@wfe/components/table'

/** Width is application-owned; the UI retains its existing pane owners. */
export function ContainerLayoutReview() {
  const [narrow, setNarrow] = createSignal(false)
  const [hidden, setHidden] = createSignal(false)
  return (
    <section aria-label="Embedded workspace review">
      <Button id="container-width" onClick={() => setNarrow(!narrow())}>
        Resize host
      </Button>
      <Button id="container-hidden" onClick={() => setHidden(!hidden())}>
        Toggle host visibility
      </Button>
      <div
        id="container-host"
        style={{
          width: narrow() ? '30rem' : '80rem',
          'max-width': '100%',
          height: '32rem',
          display: hidden() ? 'none' : undefined,
        }}
      >
        <DashboardShell
          id="container-dashboard"
          header="Embedded layout"
          navigation={(controls) => (
            <>
              <span id="container-mode">
                {controls.mobile() ? 'drawer' : 'rail'}
              </span>
              <Input aria-label="Embedded navigation draft" />
              {Array.from({ length: 25 }, (_, index) => (
                <p>Navigation item {index + 1}</p>
              ))}
            </>
          )}
          context={() => <Input aria-label="Embedded context draft" />}
        >
          <TableWorkspace
            label="Embedded table"
            controlsPlacement="top"
            controls={<Input aria-label="Embedded filter draft" />}
          >
            <Input aria-label="Embedded result draft" />
            <div
              style={{ width: '26rem', 'max-width': '100%', height: '18rem' }}
            >
              <TableWorkspace
                label="Nested embedded table"
                controlsPlacement="top"
                controls={
                  <div class="display-fields" style={{ display: 'flex' }}>
                    <Input aria-label="Nested first filter" />
                    <Input aria-label="Nested second filter" />
                  </div>
                }
              >
                <p>Nested results</p>
              </TableWorkspace>
            </div>
            {Array.from({ length: 40 }, (_, index) => (
              <p>Result {index + 1}</p>
            ))}
          </TableWorkspace>
        </DashboardShell>
      </div>
    </section>
  )
}

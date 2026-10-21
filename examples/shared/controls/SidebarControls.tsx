import { nativeEvents } from '@wfe/components/events'
import { createSignal } from 'solid-js'
import { Button, Icon, Input } from '@wfe/components'
import { DashboardShell, SidebarGroup } from '@wfe/components/layout'

function navigationClick(
  event: MouseEvent,
  close: () => void,
  closeShell: () => void,
) {
  if (
    event.button !== 0 ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    event.altKey
  )
    return
  close()
  closeShell()
}

/** Generic shell fixture also rendered by the hydration example. */
export function SidebarControls() {
  const [collapsed, setCollapsed] = createSignal(false)
  const [open, setOpen] = createSignal(true)
  const [collectionsOpen, setCollectionsOpen] = createSignal(true)
  const [reportsOpen, setReportsOpen] = createSignal(false)
  const [behavior, setBehavior] = createSignal<'flyout' | 'expand'>('flyout')
  return (
    <div id="sidebar-review" style={{ height: '20rem' }}>
      <DashboardShell
        mainAs="section"
        mainLabel="Sidebar example content"
        navigationCollapsed={collapsed()}
        onNavigationCollapsedChange={setCollapsed}
        navigationLabel="Fixture sidebar"
        header={
          <>
            <Button
              id="sidebar-collapse"
              onClick={() => setCollapsed(!collapsed())}
            >
              Toggle icons
            </Button>
            <Button
              id="sidebar-behavior"
              onClick={() =>
                setBehavior(behavior() === 'flyout' ? 'expand' : 'flyout')
              }
            >
              Change icon behavior
            </Button>
          </>
        }
        navigation={(controls) => (
          <>
            <SidebarGroup
              label="Fixture pages"
              icon={<Icon name="form" />}
              compact={controls.compact()}
              open={open()}
              onOpenChange={setOpen}
              behavior={behavior()}
              onExpand={() => setCollapsed(false)}
            >
              {(close) => (
                <a
                  id="sidebar-destination"
                  href="#sidebar-draft"
                  ref={nativeEvents<HTMLAnchorElement>({
                    click: (event) =>
                      navigationClick(event, close, controls.close),
                  })}
                >
                  Destination
                </a>
              )}
            </SidebarGroup>
            <SidebarGroup
              label="Collections"
              compact={controls.compact()}
              open={collectionsOpen()}
              onOpenChange={setCollectionsOpen}
              behavior={behavior()}
              onExpand={() => setCollapsed(false)}
            >
              {(close) => (
                <SidebarGroup
                  label="Reports"
                  compact={false}
                  open={reportsOpen()}
                  onOpenChange={setReportsOpen}
                  onExpand={() => {}}
                >
                  {() => (
                    <a
                      href="#sidebar-draft"
                      ref={nativeEvents<HTMLAnchorElement>({
                        click: (event) =>
                          navigationClick(event, close, controls.close),
                      })}
                    >
                      Saved report
                    </a>
                  )}
                </SidebarGroup>
              )}
            </SidebarGroup>
          </>
        )}
      >
        <Input
          id="sidebar-draft"
          aria-label="Sidebar content draft"
          defaultValue="Retained content"
        />
      </DashboardShell>
    </div>
  )
}

import { Show, createSignal } from 'solid-js'
import { Icon, IconButton } from '@wfe/components'
import { TableColumnResize } from '@wfe/components/table'
import type {
  NativeColumn,
  NativeTable,
  TableFilterCriteria,
} from '@wfe/components/table'
import { TableView } from '@wfe/generator'
import type { CustomCellProps, TableDescription } from '@wfe/generator'
import type { NameRow } from './application'
import type { PlatformRoute } from './route'
import type { PlatformApplication, PlatformNavigate } from './view-types'
import { createPlatformTableSelection } from './table-selection'
import { metadataTableColumns } from './metadata-description'
import projectResult from './snapshot/metadata/project/list.result.json'
import environmentResult from './snapshot/metadata/environment/list.result.json'

// Keep this owner mounted across routes. The two hidden panels retain table state.
export function ProjectTables(props: {
  app: PlatformApplication
  navigate: PlatformNavigate
  accessible: boolean
  routeProject: string
}) {
  const app = props.app
  const navigate: PlatformNavigate = (route) => props.navigate(route)
  const accessible = () => props.accessible
  const routeProject = () => props.routeProject
  const projectsSelection = createPlatformTableSelection(app.projectsTable)
  const environmentsSelection = createPlatformTableSelection(
    app.environmentsTable,
  )
  const [projectsCollapsed, setProjectsCollapsed] = createSignal(true)
  const [environmentsCollapsed, setEnvironmentsCollapsed] = createSignal(true)
  const projectHeader = (column: NativeColumn<NameRow, unknown>) => (
    <TableColumnResize
      size={column.getSize()}
      min={40}
      max={4000}
      onSizeChange={column.setSize}
      label={
        column.id === 'name'
          ? 'Project'
          : column.id === 'state'
            ? 'State'
            : 'Actions'
      }
    />
  )
  const environmentHeader = (column: NativeColumn<NameRow, unknown>) => (
    <TableColumnResize
      size={column.getSize()}
      min={40}
      max={4000}
      onSizeChange={column.setSize}
      label={
        column.id === 'name'
          ? 'Environment'
          : column.id === 'state'
            ? 'State'
            : 'Actions'
      }
    />
  )
  const ProjectAction = (props: CustomCellProps<NameRow, unknown>) => {
    const target = (): PlatformRoute => ({
      screen: 'project',
      project: props.row.id,
    })
    return (
      <div class="platform-inline-actions">
        <IconButton
          aria-label={`Open project ${props.row.id}`}
          title={`Open project ${props.row.id}`}
          onClick={() => navigate(target())}
        >
          <Icon name="view" />
        </IconButton>
        <IconButton
          aria-label={`View members of ${props.row.id}`}
          title={`View members of ${props.row.id}`}
          onClick={() => navigate({ screen: 'members', project: props.row.id })}
        >
          <Icon name="people" />
        </IconButton>
      </div>
    )
  }
  const EnvironmentAction = (props: CustomCellProps<NameRow, unknown>) => {
    const target = (): PlatformRoute => {
      const route = app.route()
      return 'project' in route
        ? { screen: 'environment', project: route.project, env: props.row.id }
        : { screen: 'projects' }
    }
    return (
      <IconButton
        aria-label={`View environment ${props.row.id}`}
        title={`View environment ${props.row.id}`}
        onClick={() => navigate(target())}
      >
        <Icon name="view" />
      </IconButton>
    )
  }
  const controls = {
    filtering: false,
    grouping: false,
    columnReordering: false,
  } as const
  const projectDescription = {
    id: 'platform-projects',
    title: 'Projects',
    columns: {
      ...metadataTableColumns(
        projectResult,
        'projects',
        {
          name: { path: 'projects[].name', label: 'Project' },
          state: { path: 'projects[].state', label: 'State' },
        },
        ['next_cursor', 'total'],
      ),
      actions: { label: 'Actions', renderer: 'openProject' },
    },
    controls,
    actions: [{ id: 'create', label: 'Create a project' }],
  } as const satisfies TableDescription
  const environmentColumns = metadataTableColumns(
    environmentResult,
    'environments',
    {
      name: { path: 'environments[].name', label: 'Environment' },
      state: { path: 'environments[].state', label: 'State' },
    },
    ['next_cursor', 'total'],
  )
  const environmentDescription = () =>
    ({
      id: 'platform-environments',
      title: `Environments · ${routeProject()}`,
      columns: {
        ...environmentColumns,
        actions: { label: 'Actions', renderer: 'openEnvironment' },
      },
      controls,
      actions: [{ id: 'members', label: 'Members' }],
    }) as const satisfies TableDescription
  const apply = (
    table: NativeTable<NameRow, unknown>,
    criteria: TableFilterCriteria,
  ) => {
    table.setGlobalFilter(criteria.globalFilter)
    table.setColumnFilters(criteria.columnFilters)
    void app.refresh()
  }
  return (
    <>
      <div
        class="platform-table-screen"
        hidden={app.route().screen !== 'projects' || !accessible()}
      >
        <TableView
          description={projectDescription}
          bindings={{
            table: app.projectsTable,
            selection: projectsSelection,
            width: app.projectsTable
              .getVisibleColumns()
              .reduce((sum, column) => sum + column.getSize(), 0),
            cells: { openProject: ProjectAction },
            status: app.listing,
            controlsCollapsed: projectsCollapsed(),
            onControlsCollapsedChange: setProjectsCollapsed,
            actions: {
              create: {
                run: () => navigate({ screen: 'create' }),
                disabled: () => !app.authority()?.orgAdmin,
              },
            },
            headerEnd: projectHeader,
            onApplyFilters: (criteria) => apply(app.projectsTable, criteria),
          }}
        />
        <Show
          when={
            !app.listing().loading &&
            !app.listing().error &&
            app.projects().length === 0
          }
        >
          <p role="status">No projects exist in this organization.</p>
        </Show>
      </div>
      <div
        class="platform-table-screen"
        hidden={app.route().screen !== 'project' || !accessible()}
      >
        <TableView
          description={environmentDescription()}
          bindings={{
            table: app.environmentsTable,
            selection: environmentsSelection,
            width: app.environmentsTable
              .getVisibleColumns()
              .reduce((sum, column) => sum + column.getSize(), 0),
            cells: { openEnvironment: EnvironmentAction },
            actions: {
              members: {
                run: () =>
                  navigate({ screen: 'members', project: routeProject() }),
              },
            },
            status: app.detail,
            controlsCollapsed: environmentsCollapsed(),
            onControlsCollapsedChange: setEnvironmentsCollapsed,
            headerEnd: environmentHeader,
            onApplyFilters: (criteria) =>
              apply(app.environmentsTable, criteria),
          }}
        />
        <Show
          when={
            !app.detail().loading &&
            !app.detail().error &&
            app.environments().length === 0
          }
        >
          <p role="status">No environments exist in this project.</p>
        </Show>
      </div>
    </>
  )
}

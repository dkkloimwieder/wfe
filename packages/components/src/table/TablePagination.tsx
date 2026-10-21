import { Show } from 'solid-js'
import { IconButton } from '../components/NativeFields'
import { Icon } from '../components/Icon'
import { SelectField } from '../components/Select'

export type TablePageSize = {
  value: number
  options: readonly number[]
  onValueChange: (value: number) => void
}

/** Applications own accepted pages, requests, totals, and page-size policy. */
export type TablePaginationProps = {
  hasPrevious: boolean
  hasNext: boolean
  onPrevious: () => void
  onNext: () => void
  pending?: boolean
  status?: string
  pageSize?: TablePageSize
  label?: string
}

/** Navigation requests never change rows or calculate pages. */
export function TablePagination(props: TablePaginationProps) {
  const choices = () => {
    const size = props.pageSize
    if (!size) return []
    if (
      !Number.isSafeInteger(size.value) ||
      size.value <= 0 ||
      !size.options.length ||
      size.options.some(
        (value) => !Number.isSafeInteger(value) || value <= 0,
      ) ||
      new Set(size.options).size !== size.options.length ||
      !size.options.includes(size.value)
    )
      throw new Error(
        'Table page size must be a positive integer from unique positive integer options',
      )
    return size.options.map((value) => ({
      value: String(value),
      label: String(value),
    }))
  }
  return (
    <nav
      class="table-pagination"
      aria-label={props.label ?? 'Table pages'}
      aria-busy={props.pending ? 'true' : undefined}
    >
      <span class="table-pagination-status" role="status">
        {props.status}
      </span>
      <Show when={props.pageSize !== undefined}>
        <SelectField
          label="Page size"
          choices={choices()}
          value={String(props.pageSize!.value)}
          disabled={props.pending}
          onValueChange={(value) => {
            const size = props.pageSize
            const next = Number(value)
            if (
              !props.pending &&
              size &&
              size.options.includes(next) &&
              next !== size.value
            )
              size.onValueChange(next)
          }}
        />
      </Show>
      <IconButton
        aria-label="Previous page"
        disabled={props.pending || !props.hasPrevious}
        onClick={() => {
          if (!props.pending && props.hasPrevious) props.onPrevious()
        }}
      >
        <Icon name="chevron-left" />
      </IconButton>
      <IconButton
        aria-label="Next page"
        disabled={props.pending || !props.hasNext}
        onClick={() => {
          if (!props.pending && props.hasNext) props.onNext()
        }}
      >
        <Icon name="chevron-right" />
      </IconButton>
    </nav>
  )
}

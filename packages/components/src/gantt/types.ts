/** Stable application-owned identifiers. */
export type GanttId = string

export interface GanttRow {
  id: GanttId
  label: string
  parentId?: GanttId
}

/** Dates are instants. End is exclusive; equal endpoints describe a milestone. */
export interface GanttRange {
  start: Date
  end: Date
}

export interface GanttInterval extends GanttRange {
  id: GanttId
  rowId: GanttId
  label: string
  /** Completed fraction, from zero to one. */
  progress?: number
  baseline?: GanttRange
  /** Treat endpoints as calendar dates in the view time zone when proposing edits. */
  dateOnly?: boolean
  readOnly?: boolean
  /** Supplied by the application; WFE does not calculate a critical path. */
  critical?: boolean
}

/** A visual connector from one interval's end to another interval's start. */
export interface GanttDependency {
  id: GanttId
  from: GanttId
  to: GanttId
}

/** A proposal only. The caller decides whether to adopt the new dates. */
export interface GanttChange extends GanttRange {
  intervalId: GanttId
  kind: 'move' | 'resize-start' | 'resize-end'
  input: 'pointer' | 'keyboard'
}

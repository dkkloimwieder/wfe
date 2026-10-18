import type { ComponentProps, JSX } from '@solidjs/web'
import { styledClasses } from '../internal/classes'
import { Polymorphic } from '../vendor/kobalte/core/src/polymorphic'
import { BreadcrumbsRoot as Root } from '../vendor/kobalte/core/src/breadcrumbs/breadcrumbs-root'
import { BreadcrumbsSeparator as Separator } from '../vendor/kobalte/core/src/breadcrumbs/breadcrumbs-separator'
export type BreadcrumbsRootProps = ComponentProps<'nav'> & {
  separator?: JSX.Element
}
export type BreadcrumbsListProps = ComponentProps<'ol'>
export type BreadcrumbsItemProps = ComponentProps<'li'>
export type BreadcrumbsLinkProps = Omit<ComponentProps<'a'>, 'href'> & {
  href: string
}
export type BreadcrumbsCurrentProps = ComponentProps<'span'>
export type BreadcrumbsSeparatorProps = ComponentProps<'span'>

export function BreadcrumbsRoot(props: BreadcrumbsRootProps) {
  return (
    <Root
      {...props}
      data-ui=""
      class={styledClasses('ui-breadcrumbs', props.class)}
    />
  )
}
export function BreadcrumbsList(props: BreadcrumbsListProps) {
  return (
    <Polymorphic
      {...props}
      as="ol"
      class={styledClasses('ui-breadcrumbs-list', props.class)}
    />
  )
}
export function BreadcrumbsItem(props: BreadcrumbsItemProps) {
  return (
    <Polymorphic
      {...props}
      as="li"
      class={styledClasses('ui-breadcrumbs-item', props.class)}
    />
  )
}
export function BreadcrumbsLink(props: BreadcrumbsLinkProps) {
  return (
    <Polymorphic
      {...props}
      as="a"
      class={styledClasses('ui-breadcrumbs-link', props.class)}
    />
  )
}
export function BreadcrumbsCurrent(props: BreadcrumbsCurrentProps) {
  return (
    <Polymorphic
      {...props}
      as="span"
      aria-current="page"
      class={styledClasses('ui-breadcrumbs-current', props.class)}
    />
  )
}
export function BreadcrumbsSeparator(props: BreadcrumbsSeparatorProps) {
  return (
    <Separator
      {...props}
      aria-hidden="true"
      class={styledClasses('ui-breadcrumbs-separator', props.class)}
    />
  )
}
export const Breadcrumbs = Object.assign(BreadcrumbsRoot, {
  Root: BreadcrumbsRoot,
  List: BreadcrumbsList,
  Item: BreadcrumbsItem,
  Link: BreadcrumbsLink,
  Current: BreadcrumbsCurrent,
  Separator: BreadcrumbsSeparator,
})

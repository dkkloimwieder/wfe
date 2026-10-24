import type { createPlatformApplication } from './application'
import type { PlatformRoute } from './route'

export type PlatformApplication = ReturnType<typeof createPlatformApplication>
export type PlatformNavigate = (route: PlatformRoute) => void
export type PlatformHref = (route: PlatformRoute) => string
export type PlatformFollow = (
  route: PlatformRoute,
  close?: () => void,
) => (event: MouseEvent & { currentTarget: HTMLAnchorElement }) => void

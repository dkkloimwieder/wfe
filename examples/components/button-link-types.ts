import type { ButtonLinkProps } from '@wfe/components'

export function buttonLinkTypeContract() {
  const valid: ButtonLinkProps = {
    href: '/records',
    target: '_blank',
    download: 'records.csv',
  }
  // @ts-expect-error Native links require a destination.
  const missing: ButtonLinkProps = {}
  // @ts-expect-error Native anchors do not support disabled.
  const disabled: ButtonLinkProps = { href: '/records', disabled: true }
  return [valid, missing, disabled]
}

import '@wfe/components/styles.css'
import { render } from '@solidjs/web'

const params = new URLSearchParams(location.search)
const root = document.getElementById('root')!
if (params.has('variants')) {
  document.body.setAttribute('data-variants-page-layout', '')
  const { Variants, loadVariantGroup } = await import('./Variants')
  const { group, specimens } = await loadVariantGroup(params.get('variants'))
  render(() => <Variants group={group} specimens={specimens} />, root)
} else {
  document.body.setAttribute('data-gallery-page', '')
  const { ThemeExplorer } = await import('./App')
  render(() => <ThemeExplorer />, root)
}

import { render } from '@solidjs/web'

const params = new URLSearchParams(location.search)
const root = document.getElementById('root')!
if (params.has('variants')) {
  const { Variants, loadVariantGroup } = await import('./Variants')
  const { group, specimens } = await loadVariantGroup(params.get('variants'))
  render(() => <Variants group={group} specimens={specimens} />, root)
} else {
  const { ThemeExplorer } = await import('./App')
  render(() => <ThemeExplorer />, root)
}

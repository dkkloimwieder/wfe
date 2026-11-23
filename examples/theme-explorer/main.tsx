import { render } from '@solidjs/web'
import { ThemeExplorer } from './App'

const showVariants = new URLSearchParams(location.search).has('variants')
const Page = showVariants
  ? (await import('./Variants')).Variants
  : ThemeExplorer
render(() => <Page />, document.getElementById('root')!)

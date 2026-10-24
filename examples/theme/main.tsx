import { render } from '@solidjs/web'
import { ThemeConsumer } from '../shared/appearance/ThemeConsumer'
render(() => <ThemeConsumer />, document.getElementById('root')!)

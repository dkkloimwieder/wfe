import { DefaultAppearance } from '../shared/appearance/DefaultAppearance'
import { WorkflowExample, ErdExample } from '../shared/diagrams/DiagramExamples'
import '@wfe/components/styles.css'
export function App() {
  return (
    <DefaultAppearance>
      <main style={{ padding: '12px', display: 'grid', gap: '24px' }}>
        <WorkflowExample />
        <ErdExample />
      </main>
    </DefaultAppearance>
  )
}

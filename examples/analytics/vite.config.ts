import { exampleConfig } from '../vite-config.ts'
import { handleAnalyticsRequest } from './demo-server.mjs'

export default exampleConfig(import.meta.url, [
  {
    name: 'analytics-demo-server',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        void handleAnalyticsRequest(request, response)
          .then((handled) => {
            if (!handled) next()
          })
          .catch(next)
      })
    },
  },
])

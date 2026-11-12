/** Prepare the static module graph before starting a browser navigation deadline. */
export async function warmupExample(server, entry = '/main.tsx') {
  const started = Date.now()
  const client = server.environments.client
  const transformed = await client.transformRequest(entry)
  if (!transformed) throw new Error(`Example entry did not transform: ${entry}`)
  await client.waitForRequestsIdle()
  return {
    entry,
    elapsed: Date.now() - started,
    modules: client.moduleGraph.idToModuleMap.size,
  }
}

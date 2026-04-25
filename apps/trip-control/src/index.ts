import { parseTripControlArgs } from "./args"
import { FileTripLedgerStore } from "./store"
import { startTripControlServer } from "./server"

export function runTripControl(args: string[] = process.argv.slice(2)): ReturnType<typeof startTripControlServer> {
  const parsed = parseTripControlArgs(args)
  const store = new FileTripLedgerStore(parsed.storePath)
  return startTripControlServer({
    store,
    ...(parsed.adminToken ? { adminToken: parsed.adminToken } : {}),
    ...(parsed.adminTokenFile ? { adminTokenFile: parsed.adminTokenFile } : {}),
    host: parsed.host,
    port: parsed.port,
    rateLimitWindowMs: parsed.rateLimitWindowMs,
    rateLimitMax: parsed.rateLimitMax,
    allowUnauthenticatedLocal: parsed.allowUnauthenticatedLocal,
  })
}

/* v8 ignore next 3 -- entry point only runs when invoked as a CLI. */
if (require.main === module) {
  runTripControl()
}

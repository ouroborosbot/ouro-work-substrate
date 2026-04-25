import { BlobServiceClient } from "@azure/storage-blob"
import { DefaultAzureCredential } from "@azure/identity"
import { parseTripControlArgs } from "./args"
import { AzureBlobTripLedgerStore, FileTripLedgerStore, type TripLedgerStore } from "./store"
import { startTripControlServer } from "./server"

function createStore(parsed: ReturnType<typeof parseTripControlArgs>): TripLedgerStore {
  if (parsed.azureAccountUrl) {
    const credential = parsed.azureManagedIdentityClientId
      ? new DefaultAzureCredential({ managedIdentityClientId: parsed.azureManagedIdentityClientId })
      : new DefaultAzureCredential()
    const serviceClient = new BlobServiceClient(parsed.azureAccountUrl, credential)
    return new AzureBlobTripLedgerStore(serviceClient, parsed.registryContainer)
  }
  /* v8 ignore next -- args parsing guarantees one of storePath / azureAccountUrl is set. */
  return new FileTripLedgerStore(parsed.storePath!)
}

export function runTripControl(args: string[] = process.argv.slice(2)): ReturnType<typeof startTripControlServer> {
  const parsed = parseTripControlArgs(args)
  return startTripControlServer({
    store: createStore(parsed),
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

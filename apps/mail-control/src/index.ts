import { BlobServiceClient } from "@azure/storage-blob"
import { DefaultAzureCredential } from "@azure/identity"
import { parseMailControlArgs } from "./args"
import { AzureBlobMailRegistryStore, FileMailRegistryStore, type MailRegistryStore } from "./store"
import { startMailControlServer } from "./server"

function createStore(parsed: ReturnType<typeof parseMailControlArgs>): MailRegistryStore {
  if (parsed.azureAccountUrl) {
    const credential = parsed.azureManagedIdentityClientId
      ? new DefaultAzureCredential({ managedIdentityClientId: parsed.azureManagedIdentityClientId })
      : new DefaultAzureCredential()
    return new AzureBlobMailRegistryStore(
      new BlobServiceClient(parsed.azureAccountUrl, credential),
      parsed.registryContainer,
      parsed.registryBlob,
      parsed.registryDomain,
    )
  }
  return new FileMailRegistryStore(parsed.storePath!, parsed.registryDomain)
}

export function runMailControl(args: string[] = process.argv.slice(2)): ReturnType<typeof startMailControlServer> {
  const parsed = parseMailControlArgs(args)
  return startMailControlServer({
    store: createStore(parsed),
    ...(parsed.adminToken ? { adminToken: parsed.adminToken } : {}),
    allowedEmailDomain: parsed.allowedEmailDomain,
    rateLimitWindowMs: parsed.rateLimitWindowMs,
    rateLimitMax: parsed.rateLimitMax,
    allowUnauthenticatedLocal: parsed.allowUnauthenticatedLocal,
    host: parsed.host,
    port: parsed.port,
  })
}

if (require.main === module) {
  runMailControl()
}

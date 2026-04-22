import { BlobServiceClient } from "@azure/storage-blob"
import { DefaultAzureCredential } from "@azure/identity"
import { parseMailIngressArgs, readRegistry } from "./args"
import { AzureBlobMailroomStore, FileMailroomStore, type MailroomStore } from "./store"
import { startMailIngress, type MailIngressServers } from "./server"
import { logEvent } from "./log"

function createStore(parsed: ReturnType<typeof parseMailIngressArgs>): MailroomStore {
  if (parsed.azureAccountUrl) {
    const credential = parsed.azureManagedIdentityClientId
      ? new DefaultAzureCredential({ managedIdentityClientId: parsed.azureManagedIdentityClientId })
      : new DefaultAzureCredential()
    return new AzureBlobMailroomStore(
      new BlobServiceClient(parsed.azureAccountUrl, credential),
      parsed.azureContainer,
    )
  }
  return new FileMailroomStore(parsed.storePath!)
}

export function runMailIngress(args: string[] = process.argv.slice(2)): MailIngressServers {
  const parsed = parseMailIngressArgs(args)
  const registry = readRegistry(parsed)
  const servers = startMailIngress({
    registry,
    store: createStore(parsed),
    smtpPort: parsed.smtpPort,
    httpPort: parsed.httpPort,
    host: parsed.host,
    maxMessageBytes: parsed.maxMessageBytes,
  })
  logEvent({
    component: "mail-ingress",
    event: "entry_started",
    message: "mail ingress entrypoint started",
    meta: {
      domain: registry.domain,
      smtpPort: parsed.smtpPort,
      httpPort: parsed.httpPort,
      store: parsed.azureAccountUrl ? "azure-blob" : "file",
    },
  })
  return servers
}

if (require.main === module) {
  runMailIngress()
}

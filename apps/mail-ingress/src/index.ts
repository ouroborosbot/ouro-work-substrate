import * as fs from "node:fs"
import { BlobServiceClient } from "@azure/storage-blob"
import { DefaultAzureCredential } from "@azure/identity"
import { parseMailIngressArgs, readRegistry } from "./args"
import { AzureBlobMailroomStore, FileMailroomStore, type MailroomStore } from "./store"
import { startMailIngress, type MailIngressServers } from "./server"
import { logEvent } from "./log"
import { AzureBlobRegistryProvider, FileRegistryProvider, StaticRegistryProvider, type MailroomRegistryProvider } from "./registry"

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

function createTlsOptions(parsed: ReturnType<typeof parseMailIngressArgs>): { key: Buffer; cert: Buffer } | undefined {
  if (!parsed.tlsKeyFile || !parsed.tlsCertFile) return undefined
  return {
    key: fs.readFileSync(parsed.tlsKeyFile),
    cert: fs.readFileSync(parsed.tlsCertFile),
  }
}

function createRegistryProvider(parsed: ReturnType<typeof parseMailIngressArgs>): MailroomRegistryProvider {
  if (parsed.registryBase64 || parsed.registryPath) {
    return parsed.registryBase64
      ? new StaticRegistryProvider(readRegistry(parsed))
      : new FileRegistryProvider(parsed.registryPath!, parsed.registryDomain)
  }
  const credential = parsed.azureManagedIdentityClientId
    ? new DefaultAzureCredential({ managedIdentityClientId: parsed.azureManagedIdentityClientId })
    : new DefaultAzureCredential()
  return new AzureBlobRegistryProvider(
    new BlobServiceClient(parsed.registryAzureAccountUrl!, credential),
    parsed.registryContainer,
    parsed.registryBlob,
    parsed.registryDomain,
    parsed.registryRefreshMs,
  )
}

export function runMailIngress(args: string[] = process.argv.slice(2)): MailIngressServers {
  const parsed = parseMailIngressArgs(args)
  const tls = createTlsOptions(parsed)
  const servers = startMailIngress({
    registryProvider: createRegistryProvider(parsed),
    store: createStore(parsed),
    smtpPort: parsed.smtpPort,
    httpPort: parsed.httpPort,
    host: parsed.host,
    maxMessageBytes: parsed.maxMessageBytes,
    maxRecipients: parsed.maxRecipients,
    maxConnections: parsed.maxConnections,
    connectionRateLimitMax: parsed.connectionRateLimitMax,
    connectionRateLimitWindowMs: parsed.connectionRateLimitWindowMs,
    ...(tls ? { tls } : {}),
  })
  logEvent({
    component: "mail-ingress",
    event: "entry_started",
    message: "mail ingress entrypoint started",
    meta: {
      domain: parsed.registryDomain,
      smtpPort: parsed.smtpPort,
      httpPort: parsed.httpPort,
      store: parsed.azureAccountUrl ? "azure-blob" : "file",
      registry: parsed.registryAzureAccountUrl ? "azure-blob" : "static",
      registryRefreshMs: parsed.registryRefreshMs,
    },
  })
  return servers
}

if (require.main === module) {
  runMailIngress()
}

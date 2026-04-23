import { BlobServiceClient } from "@azure/storage-blob"
import { DefaultAzureCredential } from "@azure/identity"
import { parseMailControlArgs } from "./args"
import { AzureBlobMailRegistryStore, FileMailRegistryStore, type MailRegistryStore } from "./store"
import { startMailControlServer } from "./server"
import { AzureBlobOutboundEventSink } from "./outbound-events"
import { createAcsSenderUsernameProvisioner } from "./sender-usernames"

function createAzureCredential(parsed: ReturnType<typeof parseMailControlArgs>): DefaultAzureCredential {
  return parsed.azureManagedIdentityClientId
    ? new DefaultAzureCredential({ managedIdentityClientId: parsed.azureManagedIdentityClientId })
    : new DefaultAzureCredential()
}

function createBlobServiceClient(parsed: ReturnType<typeof parseMailControlArgs>, credential: DefaultAzureCredential): BlobServiceClient {
  return new BlobServiceClient(parsed.azureAccountUrl!, credential)
}

function createStore(parsed: ReturnType<typeof parseMailControlArgs>, blobServiceClient?: BlobServiceClient): MailRegistryStore {
  if (parsed.azureAccountUrl) {
    return new AzureBlobMailRegistryStore(
      blobServiceClient ?? createBlobServiceClient(parsed, createAzureCredential(parsed)),
      parsed.registryContainer,
      parsed.registryBlob,
      parsed.registryDomain,
    )
  }
  return new FileMailRegistryStore(parsed.storePath!, parsed.registryDomain)
}

export function runMailControl(args: string[] = process.argv.slice(2)): ReturnType<typeof startMailControlServer> {
  const parsed = parseMailControlArgs(args)
  const azureCredential = parsed.azureAccountUrl || parsed.outboundAcs ? createAzureCredential(parsed) : undefined
  const blobServiceClient = parsed.azureAccountUrl ? createBlobServiceClient(parsed, azureCredential!) : undefined
  return startMailControlServer({
    store: createStore(parsed, blobServiceClient),
    ...(parsed.adminToken ? { adminToken: parsed.adminToken } : {}),
    ...(parsed.adminTokenFile ? { adminTokenFile: parsed.adminTokenFile } : {}),
    allowedEmailDomain: parsed.allowedEmailDomain,
    ...(parsed.outboundAcs
      ? {
          outboundSenderProvisioner: createAcsSenderUsernameProvisioner({
            ...parsed.outboundAcs,
            ...(parsed.azureManagedIdentityClientId ? { managedIdentityClientId: parsed.azureManagedIdentityClientId } : {}),
            ...(azureCredential ? { credential: azureCredential } : {}),
          }),
        }
      : {}),
    ...(parsed.azureAccountUrl
      ? {
          publicRegistry: {
            kind: "azure-blob" as const,
            azureAccountUrl: parsed.azureAccountUrl,
            container: parsed.registryContainer,
            blob: parsed.registryBlob,
            domain: parsed.registryDomain.toLowerCase(),
          },
          blobStore: {
            kind: "azure-blob" as const,
            azureAccountUrl: parsed.azureAccountUrl,
            container: parsed.registryContainer,
          },
          outboundEvents: new AzureBlobOutboundEventSink(blobServiceClient!, parsed.registryContainer),
        }
      : {}),
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

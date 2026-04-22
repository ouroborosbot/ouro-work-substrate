import * as fs from "node:fs"
import * as path from "node:path"
import { BlobServiceClient, type BlockBlobClient } from "@azure/storage-blob"
import { ensurePublicMailboxRegistry, type MailroomPublicEnsureResult, type MailroomRegistry } from "@ouro/work-protocol"

export interface EnsureMailboxInput {
  agentId: string
  ownerEmail?: string
  source?: string
  sourceTag?: string
}

export interface MailRegistryStore {
  ensureMailbox(input: EnsureMailboxInput): Promise<MailroomPublicEnsureResult & { revision: string }>
  read(): Promise<{ registry: MailroomRegistry; revision: string }>
}

function emptyRegistry(domain: string): MailroomRegistry {
  return {
    schemaVersion: 1,
    domain,
    mailboxes: [],
    sourceGrants: [],
  }
}

function registryRevision(registry: MailroomRegistry): string {
  return `${registry.mailboxes.length}:${registry.sourceGrants.length}:${Buffer.from(JSON.stringify(registry)).byteLength}`
}

export class FileMailRegistryStore implements MailRegistryStore {
  constructor(
    private readonly filePath: string,
    private readonly domain: string,
  ) {}

  async read(): Promise<{ registry: MailroomRegistry; revision: string }> {
    if (!fs.existsSync(this.filePath)) {
      const registry = emptyRegistry(this.domain)
      return { registry, revision: registryRevision(registry) }
    }
    const registry = JSON.parse(fs.readFileSync(this.filePath, "utf-8")) as MailroomRegistry
    return { registry, revision: registryRevision(registry) }
  }

  async ensureMailbox(input: EnsureMailboxInput): Promise<MailroomPublicEnsureResult & { revision: string }> {
    const { registry } = await this.read()
    const ensured = ensurePublicMailboxRegistry({ ...input, domain: this.domain, registry })
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true })
    fs.writeFileSync(this.filePath, `${JSON.stringify(ensured.registry, null, 2)}\n`, "utf-8")
    return { ...ensured, revision: registryRevision(ensured.registry) }
  }
}

async function downloadRegistry(blob: BlockBlobClient, domain: string): Promise<{ registry: MailroomRegistry; etag?: string }> {
  if (!await blob.exists()) return { registry: emptyRegistry(domain) }
  const response = await blob.download()
  if (!response.readableStreamBody) throw new Error("registry blob download returned no readable stream")
  const chunks: Buffer[] = []
  for await (const chunk of response.readableStreamBody) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return {
    registry: JSON.parse(Buffer.concat(chunks).toString("utf-8")) as MailroomRegistry,
    ...(response.etag ? { etag: response.etag } : {}),
  }
}

export class AzureBlobMailRegistryStore implements MailRegistryStore {
  constructor(
    private readonly serviceClient: BlobServiceClient,
    private readonly containerName: string,
    private readonly blobName: string,
    private readonly domain: string,
  ) {}

  private async blob(): Promise<BlockBlobClient> {
    const container = this.serviceClient.getContainerClient(this.containerName)
    await container.createIfNotExists()
    return container.getBlockBlobClient(this.blobName)
  }

  async read(): Promise<{ registry: MailroomRegistry; revision: string }> {
    const { registry } = await downloadRegistry(await this.blob(), this.domain)
    return { registry, revision: registryRevision(registry) }
  }

  async ensureMailbox(input: EnsureMailboxInput): Promise<MailroomPublicEnsureResult & { revision: string }> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const blob = await this.blob()
      const existing = await downloadRegistry(blob, this.domain)
      const ensured = ensurePublicMailboxRegistry({
        ...input,
        domain: this.domain,
        registry: existing.registry,
      })
      const payload = Buffer.from(`${JSON.stringify(ensured.registry, null, 2)}\n`, "utf-8")
      try {
        await blob.uploadData(payload, {
          conditions: existing.etag ? { ifMatch: existing.etag } : { ifNoneMatch: "*" },
        })
        return { ...ensured, revision: registryRevision(ensured.registry) }
      } catch (error) {
        if (attempt === 2) throw error
      }
    }
    /* v8 ignore next -- the loop either returns after upload or rethrows the final upload error. */
    throw new Error("mail registry update failed after retries")
  }
}

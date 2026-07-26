import * as fs from "node:fs"
import * as path from "node:path"
import { BlobServiceClient, type BlockBlobClient } from "@azure/storage-blob"
import {
  assertPublishableMailroomRegistry,
  ensurePublicMailboxRegistry,
  rotateMailroomKeys,
  type MailroomPublicEnsureResult,
  type MailroomRegistry,
  type MailroomRotationResult,
} from "@ouro/work-protocol"

export interface EnsureMailboxInput {
  agentId: string
  ownerEmail?: string
  source?: string
  sourceTag?: string
}

export interface RotateKeysInput {
  agentId: string
  compartments?: string[]
  graceMs?: number
  now?: Date
}

export interface MailRegistryStore {
  ensureMailbox(input: EnsureMailboxInput): Promise<MailroomPublicEnsureResult & { revision: string }>
  /**
   * Rotate key material for an agent while holding every identity fixed.
   *
   * The publish is gated on `assertPublishableMailroomRegistry`, so a rotation that would drop
   * a compartment id or a deliverable address never reaches the served registry.
   */
  rotateKeys(input: RotateKeysInput): Promise<MailroomRotationResult & { revision: string }>
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

function registryPayload(registry: MailroomRegistry): string {
  return `${JSON.stringify(registry, null, 2)}\n`
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

  /**
   * Write through a temp file and rename.
   *
   * `renameSync` is atomic within a filesystem, so a crash or a rejected publish leaves the
   * previous registry byte-for-byte intact and still serving instead of truncated.
   */
  private publish(registry: MailroomRegistry, previous: MailroomRegistry): void {
    assertPublishableMailroomRegistry({ registry, previous })
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true })
    const tempPath = `${this.filePath}.${process.pid}.tmp`
    fs.writeFileSync(tempPath, registryPayload(registry), "utf-8")
    fs.renameSync(tempPath, this.filePath)
  }

  async ensureMailbox(input: EnsureMailboxInput): Promise<MailroomPublicEnsureResult & { revision: string }> {
    const { registry } = await this.read()
    const ensured = ensurePublicMailboxRegistry({ ...input, domain: this.domain, registry })
    this.publish(ensured.registry, registry)
    return { ...ensured, revision: registryRevision(ensured.registry) }
  }

  async rotateKeys(input: RotateKeysInput): Promise<MailroomRotationResult & { revision: string }> {
    const { registry } = await this.read()
    const rotated = rotateMailroomKeys({ ...input, registry })
    this.publish(rotated.registry, registry)
    return { ...rotated, revision: registryRevision(rotated.registry) }
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

  /**
   * Read-modify-publish under an etag condition, gated on registry integrity.
   *
   * The gate runs against the revision this attempt actually read, so a rotation or ensure that
   * would orphan an id or address is rejected before any bytes are uploaded.
   */
  private async publish<T extends { registry: MailroomRegistry }>(
    mutate: (previous: MailroomRegistry) => T,
  ): Promise<T & { revision: string }> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const blob = await this.blob()
      const existing = await downloadRegistry(blob, this.domain)
      const next = mutate(existing.registry)
      assertPublishableMailroomRegistry({ registry: next.registry, previous: existing.registry })
      const payload = Buffer.from(registryPayload(next.registry), "utf-8")
      try {
        await blob.uploadData(payload, {
          conditions: existing.etag ? { ifMatch: existing.etag } : { ifNoneMatch: "*" },
        })
        return { ...next, revision: registryRevision(next.registry) }
      } catch (error) {
        if (attempt === 2) throw error
      }
    }
    /* v8 ignore next -- the loop either returns after upload or rethrows the final upload error. */
    throw new Error("mail registry update failed after retries")
  }

  async ensureMailbox(input: EnsureMailboxInput): Promise<MailroomPublicEnsureResult & { revision: string }> {
    return this.publish((previous) => ensurePublicMailboxRegistry({ ...input, domain: this.domain, registry: previous }))
  }

  async rotateKeys(input: RotateKeysInput): Promise<MailroomRotationResult & { revision: string }> {
    return this.publish((previous) => rotateMailroomKeys({ ...input, registry: previous }))
  }
}

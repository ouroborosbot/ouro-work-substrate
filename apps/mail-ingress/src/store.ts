import * as fs from "node:fs"
import * as path from "node:path"
import { BlobServiceClient } from "@azure/storage-blob"
import {
  buildStoredMailMessage,
  classifyMailAddress,
  classifyResolvedMailPlacement,
  decryptStoredMailMessage,
  type DecryptedMailMessage,
  type EncryptedPayload,
  type MailAddressResolutionFailure,
  type MailAuthenticationSummary,
  type MailClassification,
  type MailEnvelopeInput,
  type MailroomRegistry,
  type PrivateMailEnvelope,
  type ResolvedMailAddress,
  type StoredMailMessage,
} from "@ouro/work-protocol"
import { logEvent } from "./log"

/**
 * A recipient the mailroom cannot serve is not automatically spam.
 *
 * `mail_delivery_orphaned` is deliberately its own greppable, error-level event: it means a
 * delivery path that used to work is now dead, which is the failure that went unnoticed for
 * 77 days when every rejection looked like an ordinary `recipient_rejected`.
 */
export function logMailAddressFailure(failure: MailAddressResolutionFailure): void {
  if (failure.reason === "unknown-address") {
    logEvent({
      component: "mail-ingress",
      event: "recipient_rejected",
      message: "smtp recipient rejected",
      meta: { address: failure.address },
    })
    return
  }
  if (failure.reason === "grant-disabled") {
    logEvent({
      level: "warn",
      component: "mail-ingress",
      event: "recipient_grant_disabled",
      message: "smtp recipient rejected because its source grant is disabled",
      meta: { address: failure.address, agentId: failure.agentId, grantId: failure.grantId },
    })
    return
  }
  logEvent({
    level: "error",
    component: "mail-ingress",
    event: "mail_delivery_orphaned",
    message: "ORPHANED MAILROOM IDENTITY: a known delivery path can no longer be served",
    meta: {
      address: failure.address,
      agentId: failure.agentId,
      grantId: failure.grantId,
      reason: failure.reason,
      detail: failure.detail,
    },
  })
}

export interface MailroomStore {
  putRawMessage(input: {
    resolved: ResolvedMailAddress
    envelope: MailEnvelopeInput
    rawMime: Buffer
    privateEnvelope: PrivateMailEnvelope
    receivedAt?: Date
    classification: MailClassification
    authentication?: MailAuthenticationSummary
  }): Promise<{ created: boolean; message: StoredMailMessage }>
  getMessage(id: string): Promise<StoredMailMessage | null>
  readRawPayload(objectName: string): Promise<EncryptedPayload | null>
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true })
}

function readJson<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T
  } catch {
    return null
  }
}

function writeJson(filePath: string, value: unknown): void {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf-8")
}

function blobText(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf-8")
}

async function downloadJson<T>(blob: { exists(): Promise<boolean>; downloadToBuffer(): Promise<Buffer> }): Promise<T | null> {
  if (!await blob.exists()) return null
  return JSON.parse((await blob.downloadToBuffer()).toString("utf-8")) as T
}

export class FileMailroomStore implements MailroomStore {
  private readonly rootDir: string

  constructor(rootDir: string) {
    this.rootDir = rootDir
    ensureDir(path.join(this.rootDir, "messages"))
    ensureDir(path.join(this.rootDir, "raw"))
    ensureDir(path.join(this.rootDir, "candidates"))
  }

  private messagePath(id: string): string {
    return path.join(this.rootDir, "messages", `${id}.json`)
  }

  private rawPath(objectName: string): string {
    return path.join(this.rootDir, objectName)
  }

  private candidatePath(id: string): string {
    return path.join(this.rootDir, "candidates", `${id}.json`)
  }

  async putRawMessage(input: Parameters<MailroomStore["putRawMessage"]>[0]): Promise<{ created: boolean; message: StoredMailMessage }> {
    const { message, rawPayload, candidate } = buildStoredMailMessage(input)
    const existing = readJson<StoredMailMessage>(this.messagePath(message.id))
    if (existing) return { created: false, message: existing }
    writeJson(this.rawPath(message.rawObject), rawPayload)
    writeJson(this.messagePath(message.id), message)
    if (candidate) writeJson(this.candidatePath(candidate.id), candidate)
    return { created: true, message }
  }

  async getMessage(id: string): Promise<StoredMailMessage | null> {
    return readJson<StoredMailMessage>(this.messagePath(id))
  }

  async readRawPayload(objectName: string): Promise<EncryptedPayload | null> {
    return readJson<EncryptedPayload>(this.rawPath(objectName))
  }
}

export class AzureBlobMailroomStore implements MailroomStore {
  private containerReady: Promise<void> | null = null

  constructor(
    private readonly serviceClient: BlobServiceClient,
    private readonly containerName: string,
  ) {}

  private get container() {
    return this.serviceClient.getContainerClient(this.containerName)
  }

  private async ensureContainer(): Promise<void> {
    if (!this.containerReady) {
      this.containerReady = this.container.createIfNotExists().then(() => undefined)
    }
    await this.containerReady
  }

  private messageBlob(id: string) {
    return this.container.getBlockBlobClient(`messages/${id}.json`)
  }

  private rawBlob(objectName: string) {
    return this.container.getBlockBlobClient(objectName)
  }

  private candidateBlob(id: string) {
    return this.container.getBlockBlobClient(`candidates/${id}.json`)
  }

  async putRawMessage(input: Parameters<MailroomStore["putRawMessage"]>[0]): Promise<{ created: boolean; message: StoredMailMessage }> {
    await this.ensureContainer()
    const { message, rawPayload, candidate } = buildStoredMailMessage(input)
    const existing = await downloadJson<StoredMailMessage>(this.messageBlob(message.id))
    if (existing) return { created: false, message: existing }
    await this.rawBlob(message.rawObject).uploadData(blobText(rawPayload))
    await this.messageBlob(message.id).uploadData(blobText(message))
    if (candidate) await this.candidateBlob(candidate.id).uploadData(blobText(candidate))
    return { created: true, message }
  }

  async getMessage(id: string): Promise<StoredMailMessage | null> {
    await this.ensureContainer()
    return downloadJson<StoredMailMessage>(this.messageBlob(id))
  }

  async readRawPayload(objectName: string): Promise<EncryptedPayload | null> {
    await this.ensureContainer()
    return downloadJson<EncryptedPayload>(this.rawBlob(objectName))
  }
}

export async function ingestRawMailToStore(input: {
  registry: MailroomRegistry
  store: MailroomStore
  envelope: MailEnvelopeInput
  rawMime: Buffer
  privateEnvelope: PrivateMailEnvelope
  receivedAt?: Date
  authentication?: MailAuthenticationSummary
}): Promise<{ accepted: StoredMailMessage[]; rejectedRecipients: string[]; orphanedRecipients: string[] }> {
  const accepted: StoredMailMessage[] = []
  const rejectedRecipients: string[] = []
  const orphanedRecipients: string[] = []
  for (const recipient of input.envelope.rcptTo) {
    const outcome = classifyMailAddress(input.registry, recipient)
    if (!outcome.ok) {
      rejectedRecipients.push(recipient)
      if (outcome.failure.reason === "orphaned-grant") orphanedRecipients.push(recipient)
      logMailAddressFailure(outcome.failure)
      continue
    }
    const resolved = outcome.resolved
    const classification = classifyResolvedMailPlacement({
      registry: input.registry,
      resolved,
      sender: input.envelope.mailFrom,
      ...(input.authentication ? { authentication: input.authentication } : {}),
    })
    const result = await input.store.putRawMessage({
      resolved,
      envelope: input.envelope,
      rawMime: input.rawMime,
      privateEnvelope: input.privateEnvelope,
      receivedAt: input.receivedAt,
      classification,
      ...(input.authentication ? { authentication: input.authentication } : {}),
    })
    accepted.push(result.message)
  }
  logEvent({
    level: orphanedRecipients.length > 0 ? "error" : "info",
    component: "mail-ingress",
    event: "mail_ingest_complete",
    message: "mail ingest completed",
    meta: { accepted: accepted.length, rejected: rejectedRecipients.length, orphaned: orphanedRecipients.length },
  })
  return { accepted, rejectedRecipients, orphanedRecipients }
}

export function decryptMessages(messages: StoredMailMessage[], privateKeys: Record<string, string>): DecryptedMailMessage[] {
  return messages.map((message) => decryptStoredMailMessage(message, privateKeys))
}

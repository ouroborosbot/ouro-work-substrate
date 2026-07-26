import * as crypto from "node:crypto"

export type TrustLevel = "self" | "family" | "friend" | "known" | "stranger"
export type MailPlacement = "imbox" | "screener" | "discarded" | "quarantine" | "draft" | "sent"
export type MailCompartmentKind = "native" | "delegated"
export type MailAuthenticationState = "pass" | "fail" | "softfail" | "neutral" | "none" | "unknown"
export type MailSenderPolicyAction = "allow" | "discard" | "quarantine"
export type MailSenderPolicyScope = "all" | MailCompartmentKind | `source:${string}`
export type MailSenderPolicyMatch =
  | { kind: "email"; value: string }
  | { kind: "domain"; value: string }
  | { kind: "source"; value: string }
  | { kind: "thread"; value: string }
export type MailDecisionAction =
  | "link-friend"
  | "create-friend"
  | "allow-sender"
  | "allow-source"
  | "allow-domain"
  | "allow-thread"
  | "discard"
  | "quarantine"
  | "restore"
export type MailScreenerCandidateStatus = "pending" | "allowed" | "discarded" | "quarantined" | "restored"
export type MailOutboundStatus = "draft" | "sent" | "failed"
export type MailboxRole = "agent-native-mailbox" | "delegated-human-mailbox"

export interface MailAuthenticationSummary {
  spf: MailAuthenticationState
  dkim: MailAuthenticationState
  dmarc: MailAuthenticationState
  arc: MailAuthenticationState
}

export interface MailDecisionActor {
  kind: "agent" | "human" | "system"
  agentId?: string
  friendId?: string
  trustLevel?: TrustLevel
  channel?: string
  sessionId?: string
}

export interface MailSenderPolicyRecord {
  schemaVersion: 1
  policyId: string
  agentId: string
  scope: MailSenderPolicyScope
  match: MailSenderPolicyMatch
  action: MailSenderPolicyAction
  actor: MailDecisionActor
  reason: string
  createdAt: string
}

export interface MailClassification {
  placement: MailPlacement
  trustReason: string
  candidate: boolean
  authentication?: MailAuthenticationSummary
}

export interface MailDecisionRecord {
  schemaVersion: 1
  id: string
  agentId: string
  messageId: string
  candidateId?: string
  action: MailDecisionAction
  actor: MailDecisionActor
  reason: string
  previousPlacement: MailPlacement
  nextPlacement: MailPlacement
  senderEmail?: string
  friendId?: string
  createdAt: string
}

export interface MailScreenerCandidate {
  schemaVersion: 1
  id: string
  agentId: string
  mailboxId: string
  messageId: string
  senderEmail: string
  senderDisplay: string
  recipient: string
  source?: string
  ownerEmail?: string
  placement: MailPlacement
  status: MailScreenerCandidateStatus
  trustReason: string
  firstSeenAt: string
  lastSeenAt: string
  messageCount: number
  resolvedByDecisionId?: string
}

export interface MailOutboundRecord {
  schemaVersion: 1
  id: string
  agentId: string
  status: MailOutboundStatus
  from: string
  to: string[]
  cc: string[]
  bcc: string[]
  subject: string
  text: string
  actor: MailDecisionActor
  reason: string
  createdAt: string
  updatedAt: string
  sentAt?: string
  transport?: string
  transportMessageId?: string
  error?: string
}

/**
 * A key that has been rotated out but is still honoured for a bounded grace window.
 *
 * Rotation is never an instant cutover: upstream forwarders, in-flight deliveries, and
 * agent vaults all cache key material. Retiring a key with an `acceptUntil` keeps those
 * references resolvable instead of orphaning them the moment a new key is published.
 */
export interface RetiredMailKey {
  keyId: string
  publicKeyPem: string
  retiredAt: string
  acceptUntil: string
}

export interface AgentMailboxRecord {
  agentId: string
  mailboxId: string
  canonicalAddress: string
  keyId: string
  publicKeyPem: string
  defaultPlacement: MailPlacement
  previousKeys?: RetiredMailKey[]
}

export interface SourceGrantRecord {
  grantId: string
  agentId: string
  ownerEmail: string
  source: string
  aliasAddress: string
  keyId: string
  publicKeyPem: string
  defaultPlacement: MailPlacement
  enabled: boolean
  /**
   * Durable forward references. A grant's `grantId` must survive key rotation, but if an
   * id or alias ever has to change, the old handle is recorded here so stored messages and
   * upstream delegations keep resolving to the live compartment.
   */
  previousGrantIds?: string[]
  previousAliasAddresses?: string[]
  previousKeys?: RetiredMailKey[]
}

export interface MailroomRegistry {
  schemaVersion: 1
  domain: string
  mailboxes: AgentMailboxRecord[]
  sourceGrants: SourceGrantRecord[]
  senderPolicies?: MailSenderPolicyRecord[]
}

export interface ResolvedMailAddress {
  address: string
  agentId: string
  mailboxId: string
  compartmentKind: MailCompartmentKind
  compartmentId: string
  keyId: string
  /** Newest-first: the current key plus every retired key still inside its grace window. */
  acceptedKeyIds: string[]
  publicKeyPem: string
  defaultPlacement: MailPlacement
  ownerEmail?: string
  source?: string
  grantId?: string
}

export interface MailEnvelopeInput {
  mailFrom: string
  rcptTo: string[]
  remoteAddress?: string
}

export interface EncryptedPayload {
  algorithm: "RSA-OAEP-SHA256+A256GCM"
  keyId: string
  wrappedKey: string
  iv: string
  authTag: string
  ciphertext: string
}

export interface PrivateMailEnvelope {
  messageId?: string
  from: string[]
  to: string[]
  cc: string[]
  subject: string
  date?: string
  text: string
  html?: string
  snippet: string
  attachments: Array<{ filename: string; contentType: string; size: number }>
  untrustedContentWarning: string
}

export interface StoredMailMessage {
  schemaVersion: 1
  id: string
  agentId: string
  mailboxId: string
  compartmentKind: MailCompartmentKind
  compartmentId: string
  grantId?: string
  ownerEmail?: string
  source?: string
  recipient: string
  envelope: MailEnvelopeInput
  placement: MailPlacement
  trustReason: string
  authentication?: MailAuthenticationSummary
  rawObject: string
  rawSha256: string
  rawSize: number
  privateEnvelope: EncryptedPayload
  receivedAt: string
}

export interface MailProvenanceDescriptor {
  mailboxRole: MailboxRole
  mailboxLabel: string
  agentId: string
  ownerEmail: string | null
  source: string | null
  recipient: string
  sendAsHumanAllowed: false
}

export interface DecryptedMailMessage extends StoredMailMessage {
  private: PrivateMailEnvelope
}

export interface MailKeyPair {
  keyId: string
  publicKeyPem: string
  privateKeyPem: string
}

export interface MailroomEnsureResult {
  registry: MailroomRegistry
  keys: Record<string, string>
  mailboxAddress: string
  sourceAlias: string | null
  addedMailbox: boolean
  addedSourceGrant: boolean
}

export interface MailroomPublicEnsureResult extends MailroomEnsureResult {
  generatedPrivateKeys: Record<string, string>
}

const LOCAL_PART_LIMIT = 64
const SNIPPET_LIMIT = 240
const RAW_OBJECT_PREFIX = "raw"

export function stableJson(value: unknown): string {
  if (value === undefined) return "null"
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`
  }
  return JSON.stringify(value)
}

export function normalizeMailAddress(address: string): string {
  const trimmed = address.trim().replace(/^<|>$/g, "").toLowerCase()
  const match = trimmed.match(/<?([^<>\s]+@[^<>\s]+)>?$/)
  const normalized = match?.[1] ?? trimmed
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) {
    throw new Error(`Invalid email address: ${address}`)
  }
  return normalized
}

export function safeAddressPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function reverseEmailRoute(ownerEmail: string): string {
  const normalized = normalizeMailAddress(ownerEmail)
  const [local, domain] = normalized.split("@")
  const domainParts = domain.split(".").reverse().map(safeAddressPart).filter(Boolean)
  const localParts = local.split(".").map(safeAddressPart).filter(Boolean)
  return [...domainParts, ...localParts].join(".")
}

export function sourceAliasForOwner(input: {
  ownerEmail: string
  agentId: string
  domain?: string
  sourceTag?: string
}): string {
  const domain = (input.domain ?? "ouro.bot").toLowerCase()
  const route = reverseEmailRoute(input.ownerEmail)
  const agentPart = safeAddressPart(input.agentId) || "agent"
  const safeSourceTag = input.sourceTag ? safeAddressPart(input.sourceTag) : ""
  const sourcePart = safeSourceTag ? `.${safeSourceTag}` : ""
  const preferredLocal = `${route}${sourcePart}.${agentPart}`
  const local = preferredLocal.length <= LOCAL_PART_LIMIT
    ? preferredLocal
    : `h-${crypto.createHash("sha256").update(preferredLocal).digest("hex").slice(0, 16)}.${agentPart}`
  return `${local}@${domain}`
}

export function generateMailKeyPair(label: string): MailKeyPair {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  })
  const keyId = `mail_${safeAddressPart(label) || "key"}_${crypto
    .createHash("sha256")
    .update(publicKey)
    .digest("hex")
    .slice(0, 16)}`
  return { keyId, publicKeyPem: publicKey, privateKeyPem: privateKey }
}

export function encryptForMailKey(plaintext: Buffer, publicKeyPem: string, keyId: string): EncryptedPayload {
  const contentKey = crypto.randomBytes(32)
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", contentKey, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const authTag = cipher.getAuthTag()
  const wrappedKey = crypto.publicEncrypt({ key: publicKeyPem, oaepHash: "sha256" }, contentKey)
  return {
    algorithm: "RSA-OAEP-SHA256+A256GCM",
    keyId,
    wrappedKey: wrappedKey.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  }
}

export function decryptMailPayload(payload: EncryptedPayload, privateKeyPem: string): Buffer {
  const contentKey = crypto.privateDecrypt({
    key: privateKeyPem,
    oaepHash: "sha256",
  }, Buffer.from(payload.wrappedKey, "base64"))
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    contentKey,
    Buffer.from(payload.iv, "base64"),
  )
  decipher.setAuthTag(Buffer.from(payload.authTag, "base64"))
  return Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ])
}

export function encryptJsonForMailKey(value: unknown, publicKeyPem: string, keyId: string): EncryptedPayload {
  return encryptForMailKey(Buffer.from(stableJson(value), "utf-8"), publicKeyPem, keyId)
}

export function decryptMailJson<T>(payload: EncryptedPayload, privateKeyPem: string): T {
  return JSON.parse(decryptMailPayload(payload, privateKeyPem).toString("utf-8")) as T
}

function normalizedAliasList(values: string[] | undefined): string[] {
  return (values ?? []).map((value) => normalizeMailAddress(value))
}

/**
 * Every key id this compartment still honours, newest first.
 *
 * The head is the key new mail is encrypted to. The tail is the bounded overlap that keeps
 * a rotation from hard-failing deliveries and vault reads that still reference the old key.
 */
export function acceptedMailKeyIds(
  record: { keyId: string; previousKeys?: RetiredMailKey[] },
  now: Date = new Date(),
): string[] {
  const nowMs = now.getTime()
  return [
    record.keyId,
    ...(record.previousKeys ?? [])
      .filter((previous) => Date.parse(previous.acceptUntil) > nowMs)
      .map((previous) => previous.keyId),
  ]
}

export type MailAddressFailureReason = "unknown-address" | "grant-disabled" | "orphaned-grant"

export interface MailAddressResolutionFailure {
  reason: MailAddressFailureReason
  address: string
  agentId?: string
  grantId?: string
  detail: string
}

export type MailAddressResolution =
  | { ok: true; resolved: ResolvedMailAddress }
  | { ok: false; failure: MailAddressResolutionFailure }

/**
 * Resolve a delivery address, distinguishing "nobody has ever lived here" from
 * "somebody lives here but the mailroom can no longer serve them".
 *
 * The second case is a dead pipe. Callers must be able to alarm on it separately instead of
 * folding it into the same rejection an unsolicited stranger gets.
 */
export function classifyMailAddress(
  registry: MailroomRegistry,
  address: string,
  options: { now?: Date } = {},
): MailAddressResolution {
  const now = options.now ?? new Date()
  const normalized = normalizeMailAddress(address)
  const mailbox = registry.mailboxes.find((entry) => normalizeMailAddress(entry.canonicalAddress) === normalized)
  if (mailbox) {
    return {
      ok: true,
      resolved: {
        address: normalized,
        agentId: mailbox.agentId,
        mailboxId: mailbox.mailboxId,
        compartmentKind: "native",
        compartmentId: mailbox.mailboxId,
        keyId: mailbox.keyId,
        acceptedKeyIds: acceptedMailKeyIds(mailbox, now),
        publicKeyPem: mailbox.publicKeyPem,
        defaultPlacement: mailbox.defaultPlacement,
      },
    }
  }

  const grant = registry.sourceGrants.find((entry) =>
    normalizeMailAddress(entry.aliasAddress) === normalized ||
    normalizedAliasList(entry.previousAliasAddresses).includes(normalized))
  if (!grant) {
    return {
      ok: false,
      failure: {
        reason: "unknown-address",
        address: normalized,
        detail: `no mailbox or source grant serves ${normalized}`,
      },
    }
  }
  if (!grant.enabled) {
    return {
      ok: false,
      failure: {
        reason: "grant-disabled",
        address: normalized,
        agentId: grant.agentId,
        grantId: grant.grantId,
        detail: `source grant ${grant.grantId} is disabled`,
      },
    }
  }
  const owningMailbox = registry.mailboxes.find((entry) => entry.agentId === grant.agentId)
  if (!owningMailbox) {
    return {
      ok: false,
      failure: {
        reason: "orphaned-grant",
        address: normalized,
        agentId: grant.agentId,
        grantId: grant.grantId,
        detail: `Source grant ${grant.grantId} has no owning mailbox for agent ${grant.agentId}`,
      },
    }
  }
  return {
    ok: true,
    resolved: {
      address: normalized,
      agentId: grant.agentId,
      mailboxId: owningMailbox.mailboxId,
      compartmentKind: "delegated",
      compartmentId: grant.grantId,
      grantId: grant.grantId,
      ownerEmail: normalizeMailAddress(grant.ownerEmail),
      source: grant.source,
      keyId: grant.keyId,
      acceptedKeyIds: acceptedMailKeyIds(grant, now),
      publicKeyPem: grant.publicKeyPem,
      defaultPlacement: grant.defaultPlacement,
    },
  }
}

export function resolveMailAddress(registry: MailroomRegistry, address: string): ResolvedMailAddress | null {
  const outcome = classifyMailAddress(registry, address)
  if (outcome.ok) return outcome.resolved
  if (outcome.failure.reason === "orphaned-grant") throw new Error(outcome.failure.detail)
  return null
}

export type ResolvedMailCompartment =
  | { compartmentKind: "native"; mailbox: AgentMailboxRecord }
  | { compartmentKind: "delegated"; grant: SourceGrantRecord }

/**
 * Look a compartment up by any id it has ever carried.
 *
 * Stored messages, decisions, and screener candidates all pin a `compartmentId`. If a grant
 * id ever changes, those records must not become unreadable, so retired ids stay resolvable.
 */
export function resolveMailCompartment(registry: MailroomRegistry, compartmentId: string): ResolvedMailCompartment | null {
  const mailbox = registry.mailboxes.find((entry) => entry.mailboxId === compartmentId)
  if (mailbox) return { compartmentKind: "native", mailbox }
  const grant = registry.sourceGrants.find((entry) =>
    entry.grantId === compartmentId || (entry.previousGrantIds ?? []).includes(compartmentId))
  return grant ? { compartmentKind: "delegated", grant } : null
}

export type MailKeyStatus = "current" | "grace" | "expired" | "unknown"

export interface MailKeyAcceptance {
  keyId: string
  status: MailKeyStatus
  compartmentKind?: MailCompartmentKind
  compartmentId?: string
  agentId?: string
  acceptUntil?: string
}

/** Decide whether a key id is still honoured, and say why it is not when it is not. */
export function classifyMailKey(
  registry: MailroomRegistry,
  keyId: string,
  options: { now?: Date } = {},
): MailKeyAcceptance {
  const nowMs = (options.now ?? new Date()).getTime()
  for (const compartment of mailroomCompartments(registry)) {
    if (compartment.keyId === keyId) {
      return {
        keyId,
        status: "current",
        compartmentKind: compartment.compartmentKind,
        compartmentId: compartment.compartmentId,
        agentId: compartment.agentId,
      }
    }
    const retired = compartment.previousKeys.find((previous) => previous.keyId === keyId)
    if (retired) {
      return {
        keyId,
        status: Date.parse(retired.acceptUntil) > nowMs ? "grace" : "expired",
        compartmentKind: compartment.compartmentKind,
        compartmentId: compartment.compartmentId,
        agentId: compartment.agentId,
        acceptUntil: retired.acceptUntil,
      }
    }
  }
  return { keyId, status: "unknown" }
}

export function describeMailProvenance(message: Pick<StoredMailMessage, "agentId" | "compartmentKind" | "ownerEmail" | "source" | "recipient">): MailProvenanceDescriptor {
  if (message.compartmentKind === "delegated") {
    const ownerEmail = message.ownerEmail ?? null
    const source = message.source ?? null
    const ownerLabel = ownerEmail ?? "unknown owner"
    const sourceLabel = source ?? "unknown source"
    return {
      mailboxRole: "delegated-human-mailbox",
      mailboxLabel: `${ownerLabel} / ${sourceLabel} delegated to ${message.agentId}`,
      agentId: message.agentId,
      ownerEmail,
      source,
      recipient: message.recipient,
      sendAsHumanAllowed: false,
    }
  }
  return {
    mailboxRole: "agent-native-mailbox",
    mailboxLabel: `${message.recipient} (native agent mail)`,
    agentId: message.agentId,
    ownerEmail: null,
    source: null,
    recipient: message.recipient,
    sendAsHumanAllowed: false,
  }
}

export function snippetText(text: string): string {
  const compact = text.replace(/\s+/g, " ").trim()
  return compact.length > SNIPPET_LIMIT ? `${compact.slice(0, SNIPPET_LIMIT - 3)}...` : compact
}

function messageStorageId(envelope: MailEnvelopeInput, raw: Buffer): string {
  const digest = crypto
    .createHash("sha256")
    .update(stableJson(envelope))
    .update("\n")
    .update(raw)
    .digest("hex")
  return `mail_${digest.slice(0, 32)}`
}

function candidateSender(input: { privateEnvelope: PrivateMailEnvelope; envelope: MailEnvelopeInput }): { email: string; display: string } {
  const parsed = input.privateEnvelope.from[0]
  if (parsed) return { email: parsed, display: parsed }
  if (!input.envelope.mailFrom.trim()) return { email: "(unknown)", display: "(unknown)" }
  try {
    const email = normalizeMailAddress(input.envelope.mailFrom)
    return { email, display: email }
  } catch {
    return { email: "(unknown)", display: input.envelope.mailFrom.trim() }
  }
}

export function buildStoredMailMessage(input: {
  resolved: ResolvedMailAddress
  envelope: MailEnvelopeInput
  rawMime: Buffer
  privateEnvelope: PrivateMailEnvelope
  receivedAt?: Date
  classification?: MailClassification
}): { message: StoredMailMessage; rawPayload: EncryptedPayload; candidate?: MailScreenerCandidate } {
  const id = messageStorageId(input.envelope, input.rawMime)
  const rawPayload = encryptForMailKey(input.rawMime, input.resolved.publicKeyPem, input.resolved.keyId)
  const privatePayload = encryptJsonForMailKey(input.privateEnvelope, input.resolved.publicKeyPem, input.resolved.keyId)
  const rawSha256 = crypto.createHash("sha256").update(input.rawMime).digest("hex")
  const placement = input.classification?.placement ?? input.resolved.defaultPlacement
  const trustReason = input.classification?.trustReason ?? (input.resolved.compartmentKind === "delegated"
    ? `delegated source grant ${input.resolved.source ?? input.resolved.compartmentId}`
    : placement === "imbox"
      ? "screened-in native agent mailbox"
      : "native agent mailbox default screener")
  const receivedAt = (input.receivedAt ?? new Date()).toISOString()
  const message: StoredMailMessage = {
    schemaVersion: 1,
    id,
    agentId: input.resolved.agentId,
    mailboxId: input.resolved.mailboxId,
    compartmentKind: input.resolved.compartmentKind,
    compartmentId: input.resolved.compartmentId,
    ...(input.resolved.grantId ? { grantId: input.resolved.grantId } : {}),
    ...(input.resolved.ownerEmail ? { ownerEmail: input.resolved.ownerEmail } : {}),
    ...(input.resolved.source ? { source: input.resolved.source } : {}),
    recipient: input.resolved.address,
    envelope: input.envelope,
    placement,
    trustReason,
    ...(input.classification?.authentication ? { authentication: input.classification.authentication } : {}),
    rawObject: `${RAW_OBJECT_PREFIX}/${id}.json`,
    rawSha256,
    rawSize: input.rawMime.byteLength,
    privateEnvelope: privatePayload,
    receivedAt,
  }
  const sender = candidateSender({ privateEnvelope: input.privateEnvelope, envelope: input.envelope })
  const candidate: MailScreenerCandidate | undefined = input.classification?.candidate || placement === "screener"
    ? {
        schemaVersion: 1,
        id: `candidate_${id}`,
        agentId: message.agentId,
        mailboxId: message.mailboxId,
        messageId: id,
        senderEmail: sender.email,
        senderDisplay: sender.display,
        recipient: message.recipient,
        ...(message.source ? { source: message.source } : {}),
        ...(message.ownerEmail ? { ownerEmail: message.ownerEmail } : {}),
        placement,
        status: "pending",
        trustReason,
        firstSeenAt: receivedAt,
        lastSeenAt: receivedAt,
        messageCount: 1,
      }
    : undefined
  return { message, rawPayload, ...(candidate ? { candidate } : {}) }
}

export function decryptStoredMailMessage(message: StoredMailMessage, privateKeys: Record<string, string>): DecryptedMailMessage {
  const privateKey = privateKeys[message.privateEnvelope.keyId]
  if (!privateKey) {
    throw new Error(`Missing private mail key ${message.privateEnvelope.keyId}`)
  }
  const decrypted = decryptMailJson<PrivateMailEnvelope>(message.privateEnvelope, privateKey)
  return { ...message, private: decrypted }
}

function cloneMailroomRegistry(registry: MailroomRegistry, domain: string): MailroomRegistry {
  return {
    schemaVersion: 1,
    domain,
    mailboxes: registry.mailboxes.map((mailbox) => ({
      ...mailbox,
      ...(mailbox.previousKeys ? { previousKeys: mailbox.previousKeys.map((key) => ({ ...key })) } : {}),
    })),
    sourceGrants: registry.sourceGrants.map((grant) => ({
      ...grant,
      ...(grant.previousGrantIds ? { previousGrantIds: [...grant.previousGrantIds] } : {}),
      ...(grant.previousAliasAddresses ? { previousAliasAddresses: [...grant.previousAliasAddresses] } : {}),
      ...(grant.previousKeys ? { previousKeys: grant.previousKeys.map((key) => ({ ...key })) } : {}),
    })),
    ...(registry.senderPolicies ? { senderPolicies: registry.senderPolicies.map((policy) => ({ ...policy })) } : {}),
  }
}

interface MailroomCompartmentView {
  compartmentKind: MailCompartmentKind
  compartmentId: string
  agentId: string
  /** Every address that must keep resolving here: the live one plus retired aliases. */
  addresses: string[]
  /** Every id that must keep resolving here: the live one plus retired ids. */
  identifiers: string[]
  keyId: string
  publicKeyPem: string
  previousKeys: RetiredMailKey[]
}

function mailroomCompartments(registry: MailroomRegistry): MailroomCompartmentView[] {
  return [
    ...registry.mailboxes.map((mailbox): MailroomCompartmentView => ({
      compartmentKind: "native",
      compartmentId: mailbox.mailboxId,
      agentId: mailbox.agentId,
      addresses: [normalizeMailAddress(mailbox.canonicalAddress)],
      identifiers: [mailbox.mailboxId],
      keyId: mailbox.keyId,
      publicKeyPem: mailbox.publicKeyPem,
      previousKeys: mailbox.previousKeys ?? [],
    })),
    ...registry.sourceGrants.map((grant): MailroomCompartmentView => ({
      compartmentKind: "delegated",
      compartmentId: grant.grantId,
      agentId: grant.agentId,
      addresses: [normalizeMailAddress(grant.aliasAddress), ...normalizedAliasList(grant.previousAliasAddresses)],
      identifiers: [grant.grantId, ...(grant.previousGrantIds ?? [])],
      keyId: grant.keyId,
      publicKeyPem: grant.publicKeyPem,
      previousKeys: grant.previousKeys ?? [],
    })),
  ]
}

export type MailroomRegistryProblemKind =
  | "orphaned-grant"
  | "duplicate-compartment-id"
  | "duplicate-address"
  | "missing-key-material"
  | "dropped-compartment"
  | "dropped-address"

export interface MailroomRegistryProblem {
  kind: MailroomRegistryProblemKind
  compartmentId: string
  detail: string
}

export class MailroomRegistryIntegrityError extends Error {
  constructor(readonly problems: MailroomRegistryProblem[]) {
    super(`mailroom registry is not publishable: ${problems.map((problem) => `${problem.kind}: ${problem.detail}`).join("; ")}`)
    this.name = "MailroomRegistryIntegrityError"
  }
}

/** Structural faults that make a registry unsafe to serve: orphans, collisions, half-written keys. */
export function validateMailroomRegistry(registry: MailroomRegistry): MailroomRegistryProblem[] {
  const problems: MailroomRegistryProblem[] = []
  const seenIdentifiers = new Set<string>()
  const seenAddresses = new Set<string>()
  for (const compartment of mailroomCompartments(registry)) {
    if (!compartment.keyId || !compartment.publicKeyPem) {
      problems.push({
        kind: "missing-key-material",
        compartmentId: compartment.compartmentId,
        detail: `${compartment.compartmentId} has no usable current key material`,
      })
    }
    for (const identifier of compartment.identifiers) {
      if (seenIdentifiers.has(identifier)) {
        problems.push({
          kind: "duplicate-compartment-id",
          compartmentId: compartment.compartmentId,
          detail: `identifier ${identifier} is claimed by more than one compartment`,
        })
      }
      seenIdentifiers.add(identifier)
    }
    for (const address of compartment.addresses) {
      if (seenAddresses.has(address)) {
        problems.push({
          kind: "duplicate-address",
          compartmentId: compartment.compartmentId,
          detail: `address ${address} is claimed by more than one compartment`,
        })
      }
      seenAddresses.add(address)
    }
  }
  for (const grant of registry.sourceGrants) {
    if (!registry.mailboxes.some((mailbox) => mailbox.agentId === grant.agentId)) {
      problems.push({
        kind: "orphaned-grant",
        compartmentId: grant.grantId,
        detail: `Source grant ${grant.grantId} has no owning mailbox for agent ${grant.agentId}`,
      })
    }
  }
  return problems
}

/**
 * Identities and addresses that resolve today but would stop resolving after `next` is published.
 *
 * This is the guard the 2026-05-07 repair needed: a rebuilt registry that quietly drops a grant
 * id or alias is exactly how a live delivery path becomes a silent dead end.
 */
export function mailroomRegistryRegressions(previous: MailroomRegistry, next: MailroomRegistry): MailroomRegistryProblem[] {
  const problems: MailroomRegistryProblem[] = []
  const nextCompartments = mailroomCompartments(next)
  const nextIdentifiers = new Set(nextCompartments.flatMap((compartment) => compartment.identifiers))
  const nextAddresses = new Set(nextCompartments.flatMap((compartment) => compartment.addresses))
  for (const compartment of mailroomCompartments(previous)) {
    for (const identifier of compartment.identifiers) {
      if (!nextIdentifiers.has(identifier)) {
        problems.push({
          kind: "dropped-compartment",
          compartmentId: compartment.compartmentId,
          detail: `identifier ${identifier} would stop resolving after this publish`,
        })
      }
    }
    for (const address of compartment.addresses) {
      if (!nextAddresses.has(address)) {
        problems.push({
          kind: "dropped-address",
          compartmentId: compartment.compartmentId,
          detail: `address ${address} would stop resolving after this publish`,
        })
      }
    }
  }
  return problems
}

/** Publish gate. A registry that is structurally broken, or that orphans what the last one served, never lands. */
export function assertPublishableMailroomRegistry(input: {
  registry: MailroomRegistry
  previous?: MailroomRegistry
}): void {
  const problems = [
    ...validateMailroomRegistry(input.registry),
    ...(input.previous ? mailroomRegistryRegressions(input.previous, input.registry) : []),
  ]
  if (problems.length > 0) throw new MailroomRegistryIntegrityError(problems)
}

export interface MailKeyRotationRecord {
  compartmentKind: MailCompartmentKind
  compartmentId: string
  agentId: string
  address: string
  previousKeyId: string
  keyId: string
  acceptUntil: string
}

export interface MailroomRotationResult {
  registry: MailroomRegistry
  generatedPrivateKeys: Record<string, string>
  rotations: MailKeyRotationRecord[]
}

export const DEFAULT_MAIL_KEY_GRACE_MS = 7 * 24 * 60 * 60 * 1000

function retainMailKeys(existing: RetiredMailKey[] | undefined, retired: RetiredMailKey, now: Date): RetiredMailKey[] {
  const nowMs = now.getTime()
  return [retired, ...(existing ?? []).filter((entry) => Date.parse(entry.acceptUntil) > nowMs)]
}

/**
 * Rotate key material without touching identity.
 *
 * `mailboxId`, `canonicalAddress`, `grantId`, and `aliasAddress` are invariant across a
 * rotation — only `keyId`/`publicKeyPem` move, and the outgoing key is retired into a bounded
 * grace window rather than deleted. The result is validated against the input registry before
 * it is returned, so a partial rotation can never escape this function.
 */
export function rotateMailroomKeys(input: {
  registry: MailroomRegistry
  agentId: string
  /** Compartment ids to rotate (current or retired ids accepted). Defaults to every compartment for the agent. */
  compartments?: string[]
  graceMs?: number
  now?: Date
}): MailroomRotationResult {
  const agentId = safeAddressPart(input.agentId) || "agent"
  const now = input.now ?? new Date()
  const graceMs = input.graceMs ?? DEFAULT_MAIL_KEY_GRACE_MS
  const registry = cloneMailroomRegistry(input.registry, input.registry.domain)
  const retiredAt = now.toISOString()
  const acceptUntil = new Date(now.getTime() + graceMs).toISOString()
  const generatedPrivateKeys: Record<string, string> = {}
  const rotations: MailKeyRotationRecord[] = []
  const selected = input.compartments ? new Set(input.compartments) : null
  const selectedMatches = (identifiers: string[]): boolean =>
    selected === null || identifiers.some((identifier) => selected.has(identifier))

  for (const mailbox of registry.mailboxes) {
    if (mailbox.agentId !== agentId || !selectedMatches([mailbox.mailboxId])) continue
    const next = generateMailKeyPair(`${agentId}-native`)
    mailbox.previousKeys = retainMailKeys(
      mailbox.previousKeys,
      { keyId: mailbox.keyId, publicKeyPem: mailbox.publicKeyPem, retiredAt, acceptUntil },
      now,
    )
    rotations.push({
      compartmentKind: "native",
      compartmentId: mailbox.mailboxId,
      agentId,
      address: mailbox.canonicalAddress,
      previousKeyId: mailbox.keyId,
      keyId: next.keyId,
      acceptUntil,
    })
    mailbox.keyId = next.keyId
    mailbox.publicKeyPem = next.publicKeyPem
    generatedPrivateKeys[next.keyId] = next.privateKeyPem
  }

  for (const grant of registry.sourceGrants) {
    if (grant.agentId !== agentId || !selectedMatches([grant.grantId, ...(grant.previousGrantIds ?? [])])) continue
    const next = generateMailKeyPair(`${agentId}-${grant.source}`)
    grant.previousKeys = retainMailKeys(
      grant.previousKeys,
      { keyId: grant.keyId, publicKeyPem: grant.publicKeyPem, retiredAt, acceptUntil },
      now,
    )
    rotations.push({
      compartmentKind: "delegated",
      compartmentId: grant.grantId,
      agentId,
      address: grant.aliasAddress,
      previousKeyId: grant.keyId,
      keyId: next.keyId,
      acceptUntil,
    })
    grant.keyId = next.keyId
    grant.publicKeyPem = next.publicKeyPem
    generatedPrivateKeys[next.keyId] = next.privateKeyPem
  }

  if (rotations.length === 0) {
    throw new Error(`No mailroom compartments matched agent ${agentId} for key rotation`)
  }
  assertPublishableMailroomRegistry({ registry, previous: input.registry })
  return { registry, generatedPrivateKeys, rotations }
}

/**
 * A vault satisfies a compartment if it holds the current key *or* a retired key still in grace.
 *
 * Without the grace clause every rotation instantly invalidates the owning agent's vault copy,
 * which turns a routine key roll into a hard reconnect failure.
 */
function requireExistingPrivateKey(
  keys: Record<string, string>,
  record: { keyId: string; previousKeys?: RetiredMailKey[] },
  label: string,
  now: Date,
): void {
  if (acceptedMailKeyIds(record, now).some((keyId) => keys[keyId])) return
  throw new Error(`Mailroom registry references ${record.keyId} for ${label}, but the private key is missing`)
}

function sourceGrantId(input: { agentId: string; ownerEmail: string; source: string }): string {
  const sourcePart = safeAddressPart(input.source) || "source"
  const ownerHash = crypto.createHash("sha256").update(normalizeMailAddress(input.ownerEmail)).digest("hex").slice(0, 8)
  return `grant_${input.agentId}_${sourcePart}_${ownerHash}`
}

export function ensureMailboxRegistry(input: {
  agentId: string
  domain?: string
  registry?: MailroomRegistry
  keys?: Record<string, string>
  ownerEmail?: string
  source?: string
  sourceTag?: string
  requireExistingKeys?: boolean
  now?: Date
}): MailroomEnsureResult {
  const domain = (input.registry?.domain ?? input.domain ?? "ouro.bot").toLowerCase()
  const agentId = safeAddressPart(input.agentId) || "agent"
  const now = input.now ?? new Date()
  const keys: Record<string, string> = { ...(input.keys ?? {}) }
  const registry: MailroomRegistry = input.registry
    ? cloneMailroomRegistry(input.registry, domain)
    : {
        schemaVersion: 1,
        domain,
        mailboxes: [],
        sourceGrants: [],
      }

  let addedMailbox = false
  let mailbox = registry.mailboxes.find((entry) => entry.agentId === agentId)
  if (mailbox) {
    if (input.requireExistingKeys !== false) {
      requireExistingPrivateKey(keys, mailbox, `mailbox ${mailbox.canonicalAddress}`, now)
    }
  } else {
    const mailboxKey = generateMailKeyPair(`${agentId}-native`)
    mailbox = {
      agentId,
      mailboxId: `mailbox_${agentId}`,
      canonicalAddress: `${agentId}@${domain}`,
      keyId: mailboxKey.keyId,
      publicKeyPem: mailboxKey.publicKeyPem,
      defaultPlacement: "screener",
    }
    registry.mailboxes.push(mailbox)
    keys[mailboxKey.keyId] = mailboxKey.privateKeyPem
    addedMailbox = true
  }

  let sourceAlias: string | null = null
  let addedSourceGrant = false
  if (input.ownerEmail) {
    const ownerEmail = normalizeMailAddress(input.ownerEmail)
    const source = (input.source?.trim() || "hey").toLowerCase()
    const existing = registry.sourceGrants.find((grant) =>
      grant.agentId === agentId &&
      normalizeMailAddress(grant.ownerEmail) === ownerEmail &&
      grant.source.toLowerCase() === source)
    if (existing) {
      if (input.requireExistingKeys !== false) {
        requireExistingPrivateKey(keys, existing, `source grant ${existing.aliasAddress}`, now)
      }
      sourceAlias = existing.aliasAddress
    } else {
      const grantKey = generateMailKeyPair(`${agentId}-${source}`)
      sourceAlias = sourceAliasForOwner({
        ownerEmail,
        agentId,
        domain,
        sourceTag: input.sourceTag ?? (source === "hey" ? undefined : source),
      })
      registry.sourceGrants.push({
        grantId: sourceGrantId({ agentId, ownerEmail, source }),
        agentId,
        ownerEmail,
        source,
        aliasAddress: sourceAlias,
        keyId: grantKey.keyId,
        publicKeyPem: grantKey.publicKeyPem,
        defaultPlacement: "imbox",
        enabled: true,
      })
      keys[grantKey.keyId] = grantKey.privateKeyPem
      addedSourceGrant = true
    }
  }

  return {
    registry,
    keys,
    mailboxAddress: mailbox.canonicalAddress,
    sourceAlias,
    addedMailbox,
    addedSourceGrant,
  }
}

export function ensurePublicMailboxRegistry(input: {
  agentId: string
  domain?: string
  registry?: MailroomRegistry
  ownerEmail?: string
  source?: string
  sourceTag?: string
}): MailroomPublicEnsureResult {
  const ensured = ensureMailboxRegistry({
    ...input,
    keys: {},
    requireExistingKeys: false,
  })
  return {
    ...ensured,
    generatedPrivateKeys: ensured.keys,
  }
}

function policyScopeApplies(policy: MailSenderPolicyRecord, resolved: ResolvedMailAddress): boolean {
  if (policy.agentId !== resolved.agentId) return false
  if (policy.scope === "all") return true
  if (policy.scope === resolved.compartmentKind) return true
  return policy.scope === `source:${resolved.source ?? ""}`
}

function policyMatchApplies(policy: MailSenderPolicyRecord, sender: string, resolved: ResolvedMailAddress): boolean {
  const normalizedSender = sender.trim() ? normalizeMailAddress(sender) : ""
  if (policy.match.kind === "source") return resolved.source === policy.match.value
  if (policy.match.kind === "email") return normalizedSender === normalizeMailAddress(policy.match.value)
  if (policy.match.kind === "domain") {
    const domain = normalizedSender.split("@")[1] ?? ""
    return domain === policy.match.value.trim().toLowerCase().replace(/^@/, "")
  }
  return false
}

export function classifyResolvedMailPlacement(input: {
  registry: MailroomRegistry
  resolved: ResolvedMailAddress
  sender: string
  authentication?: MailAuthenticationSummary
}): MailClassification {
  const policy = (input.registry.senderPolicies ?? []).find((candidate) =>
    policyScopeApplies(candidate, input.resolved) &&
    policyMatchApplies(candidate, input.sender, input.resolved))

  if (policy?.action === "allow") {
    return {
      placement: "imbox",
      trustReason: `sender policy ${policy.policyId}: ${policy.reason}`,
      candidate: false,
      ...(input.authentication ? { authentication: input.authentication } : {}),
    }
  }
  if (policy?.action === "discard") {
    return {
      placement: "discarded",
      trustReason: `sender policy ${policy.policyId}: ${policy.reason}`,
      candidate: false,
      ...(input.authentication ? { authentication: input.authentication } : {}),
    }
  }
  if (policy?.action === "quarantine") {
    return {
      placement: "quarantine",
      trustReason: `sender policy ${policy.policyId}: ${policy.reason}`,
      candidate: false,
      ...(input.authentication ? { authentication: input.authentication } : {}),
    }
  }

  if (input.resolved.compartmentKind === "delegated") {
    return {
      placement: input.resolved.defaultPlacement,
      trustReason: `delegated source grant ${input.resolved.source ?? input.resolved.compartmentId}`,
      candidate: false,
      ...(input.authentication ? { authentication: input.authentication } : {}),
    }
  }

  return {
    placement: "screener",
    trustReason: "native agent mailbox sender needs screener decision",
    candidate: true,
    ...(input.authentication ? { authentication: input.authentication } : {}),
  }
}

export function buildSenderPolicy(input: {
  agentId: string
  scope: MailSenderPolicyScope
  match: MailSenderPolicyMatch
  action: MailSenderPolicyAction
  actor: MailDecisionActor
  reason: string
  createdAt?: string
}): MailSenderPolicyRecord {
  const policyId = `policy_${crypto.createHash("sha256").update(stableJson(input)).digest("hex").slice(0, 16)}`
  return {
    schemaVersion: 1,
    policyId,
    agentId: input.agentId,
    scope: input.scope,
    match: input.match,
    action: input.action,
    actor: input.actor,
    reason: input.reason,
    createdAt: input.createdAt ?? new Date().toISOString(),
  }
}

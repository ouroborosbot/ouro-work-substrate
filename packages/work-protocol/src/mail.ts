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
export type MailOutboundStatus =
  | "draft"
  | "sent"
  | "submitted"
  | "accepted"
  | "delivered"
  | "bounced"
  | "suppressed"
  | "quarantined"
  | "spam-filtered"
  | "failed"
export type MailboxRole = "agent-native-mailbox" | "delegated-human-mailbox"
export type MailSendAuthority = "agent-native"
export type MailSendMode = "confirmed" | "autonomous"
export type MailOutboundProvider = "local-sink" | "azure-communication-services"
export type MailOutboundDeliveryEventOutcome =
  | "accepted"
  | "delivered"
  | "bounced"
  | "suppressed"
  | "quarantined"
  | "spam-filtered"
  | "failed"
export type MailIngestKind = "smtp" | "mbox-import"
export type MailAutonomyDecisionMode = "autonomous" | "confirmation-required" | "blocked" | "confirmed"
export type MailAutonomyDecisionFallback = "CONFIRM_SEND" | "none"
export type MailAutonomyDecisionCode =
  | "allowed"
  | "explicit-confirmation"
  | "autonomy-policy-disabled"
  | "autonomy-kill-switch"
  | "recipient-not-allowed"
  | "recipient-limit-exceeded"
  | "autonomous-rate-limit"
  | "delegated-send-as-human-not-authorized"
  | "agent-mismatch"
  | "native-mailbox-mismatch"
  | "draft-not-sendable"

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

export interface MailAutonomyRateLimit {
  maxSends: number
  windowMs: number
}

export interface MailAutonomyPolicy {
  schemaVersion: 1
  policyId: string
  agentId: string
  mailboxAddress: string
  enabled: boolean
  killSwitch: boolean
  allowedRecipients: string[]
  allowedDomains: string[]
  maxRecipientsPerMessage: number
  rateLimit: MailAutonomyRateLimit
  actor?: MailDecisionActor
  reason?: string
  updatedAt?: string
}

export interface MailAutonomyDecision {
  schemaVersion: 1
  allowed: boolean
  mode: MailAutonomyDecisionMode
  code: MailAutonomyDecisionCode
  reason: string
  evaluatedAt: string
  recipients: string[]
  fallback: MailAutonomyDecisionFallback
  policyId?: string
  remainingSendsInWindow?: number
}

export interface MailOutboundDeliveryEvent {
  schemaVersion: 1
  provider: MailOutboundProvider
  providerEventId: string
  providerMessageId: string
  outcome: MailOutboundDeliveryEventOutcome
  recipient?: string
  occurredAt: string
  receivedAt: string
  bodySafeSummary: string
  providerStatus?: string
}

export interface MailOutboundRecord {
  schemaVersion: 1
  id: string
  agentId: string
  status: MailOutboundStatus
  mailboxRole?: MailboxRole
  sendAuthority?: MailSendAuthority
  ownerEmail?: string | null
  source?: string | null
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
  sendMode?: MailSendMode
  policyDecision?: MailAutonomyDecision
  provider?: MailOutboundProvider
  providerMessageId?: string
  providerRequestId?: string
  operationLocation?: string
  submittedAt?: string
  acceptedAt?: string
  deliveredAt?: string
  failedAt?: string
  deliveryEvents?: MailOutboundDeliveryEvent[]
  sentAt?: string
  transport?: string
  transportMessageId?: string
  error?: string
}

export interface BuildMailProviderSubmissionInput {
  draft: MailOutboundRecord
  provider: MailOutboundProvider
  providerMessageId: string
  submittedAt: string
  operationLocation?: string
  providerRequestId?: string
}

export interface ReconcileMailDeliveryEventInput {
  outbound: MailOutboundRecord
  event: MailOutboundDeliveryEvent
}

export interface AgentMailboxRecord {
  agentId: string
  mailboxId: string
  canonicalAddress: string
  keyId: string
  publicKeyPem: string
  defaultPlacement: MailPlacement
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

export interface MailIngestProvenance {
  schemaVersion: 1
  kind: MailIngestKind
  importedAt?: string
  sourceFreshThrough?: string | null
  attentionSuppressed?: boolean
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
  ingest: MailIngestProvenance
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

export interface MailroomPublicRotateResult extends MailroomPublicEnsureResult {
  rotatedMailbox: boolean
  rotatedSourceGrant: boolean
}

export interface BuildNativeMailAutonomyPolicyInput {
  agentId: string
  mailboxAddress: string
  enabled: boolean
  killSwitch: boolean
  allowedRecipients?: string[]
  allowedDomains?: string[]
  maxRecipientsPerMessage: number
  rateLimit: MailAutonomyRateLimit
  actor?: MailDecisionActor
  reason?: string
  updatedAt?: string
}

export interface EvaluateNativeMailSendPolicyInput {
  policy: MailAutonomyPolicy
  draft: MailOutboundRecord
  recentOutbound: MailOutboundRecord[]
  now?: Date
}

export interface BuildConfirmedMailSendDecisionInput {
  draft: MailOutboundRecord
  policy?: MailAutonomyPolicy
  now?: Date
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

function normalizeDomain(value: string): string {
  return value.trim().toLowerCase().replace(/^@/, "")
}

function outboundRecipients(record: Pick<MailOutboundRecord, "to" | "cc" | "bcc">): string[] {
  return [...record.to, ...record.cc, ...record.bcc].map(normalizeMailAddress)
}

function autonomyPolicyId(input: Omit<MailAutonomyPolicy, "schemaVersion" | "policyId">): string {
  return `mail_auto_${crypto.createHash("sha256").update(stableJson(input)).digest("hex").slice(0, 16)}`
}

export function buildNativeMailAutonomyPolicy(input: BuildNativeMailAutonomyPolicyInput): MailAutonomyPolicy {
  const normalized: Omit<MailAutonomyPolicy, "schemaVersion" | "policyId"> = {
    agentId: safeAddressPart(input.agentId) || "agent",
    mailboxAddress: normalizeMailAddress(input.mailboxAddress),
    enabled: input.enabled,
    killSwitch: input.killSwitch,
    allowedRecipients: [...new Set((input.allowedRecipients ?? []).map(normalizeMailAddress))].sort(),
    allowedDomains: [...new Set((input.allowedDomains ?? []).map(normalizeDomain).filter(Boolean))].sort(),
    maxRecipientsPerMessage: Math.max(1, Math.floor(input.maxRecipientsPerMessage)),
    rateLimit: {
      maxSends: Math.max(0, Math.floor(input.rateLimit.maxSends)),
      windowMs: Math.max(1, Math.floor(input.rateLimit.windowMs)),
    },
    ...(input.actor ? { actor: input.actor } : {}),
    ...(input.reason ? { reason: input.reason } : {}),
    ...(input.updatedAt ? { updatedAt: input.updatedAt } : {}),
  }
  return {
    schemaVersion: 1,
    policyId: autonomyPolicyId(normalized),
    ...normalized,
  }
}

function autonomyDecision(input: Omit<MailAutonomyDecision, "schemaVersion">): MailAutonomyDecision {
  return { schemaVersion: 1, ...input }
}

function recipientDomain(recipient: string): string {
  return recipient.slice(recipient.indexOf("@") + 1).toLowerCase()
}

function isRecipientAllowed(policy: MailAutonomyPolicy, recipient: string): boolean {
  return policy.allowedRecipients.includes(recipient) || policy.allowedDomains.includes(recipientDomain(recipient))
}

function autonomousSentAt(record: MailOutboundRecord): string | null {
  if (record.status !== "sent" || record.sendMode !== "autonomous") return null
  return record.sentAt ?? record.updatedAt
}

function countRecentAutonomousSends(input: {
  recentOutbound: MailOutboundRecord[]
  nowMs: number
  windowMs: number
}): number {
  const startsAt = input.nowMs - input.windowMs
  return input.recentOutbound.filter((record) => {
    const sentAt = autonomousSentAt(record)
    if (!sentAt) return false
    const sentMs = Date.parse(sentAt)
    return Number.isFinite(sentMs) && sentMs >= startsAt && sentMs <= input.nowMs
  }).length
}

export function evaluateNativeMailSendPolicy(input: EvaluateNativeMailSendPolicyInput): MailAutonomyDecision {
  const now = input.now ?? new Date()
  const evaluatedAt = now.toISOString()
  const recipients = outboundRecipients(input.draft)
  const policyId = input.policy.policyId
  const blocked = (
    code: MailAutonomyDecisionCode,
    reason: string,
    mode: MailAutonomyDecisionMode = "blocked",
    fallback: MailAutonomyDecisionFallback = "none",
  ) => autonomyDecision({
    allowed: false,
    mode,
    code,
    reason,
    evaluatedAt,
    recipients,
    fallback,
    policyId,
  })

  if (input.draft.status !== "draft") {
    return blocked("draft-not-sendable", `Draft ${input.draft.id} is already ${input.draft.status}`)
  }
  if (input.draft.mailboxRole === "delegated-human-mailbox" || input.draft.ownerEmail || input.draft.source || input.draft.sendAuthority !== "agent-native") {
    return blocked("delegated-send-as-human-not-authorized", "Delegated human mail does not grant send-as-human authority")
  }
  if (safeAddressPart(input.draft.agentId) !== input.policy.agentId) {
    return blocked("agent-mismatch", `Draft belongs to ${input.draft.agentId}, not ${input.policy.agentId}`)
  }
  if (normalizeMailAddress(input.draft.from) !== input.policy.mailboxAddress) {
    return blocked("native-mailbox-mismatch", `${input.draft.from} is not the native mailbox ${input.policy.mailboxAddress}`)
  }
  if (!input.policy.enabled) {
    return blocked("autonomy-policy-disabled", "Autonomous native-agent mail policy is disabled", "confirmation-required", "CONFIRM_SEND")
  }
  if (input.policy.killSwitch) {
    return blocked("autonomy-kill-switch", "Autonomous native-agent mail kill switch is enabled", "confirmation-required", "CONFIRM_SEND")
  }
  if (recipients.length > input.policy.maxRecipientsPerMessage) {
    return blocked("recipient-limit-exceeded", `Autonomous native-agent mail is limited to ${input.policy.maxRecipientsPerMessage} recipient(s)`)
  }
  const unallowed = recipients.find((recipient) => !isRecipientAllowed(input.policy, recipient))
  if (unallowed) {
    return blocked(
      "recipient-not-allowed",
      `${unallowed} is not allowed for autonomous native-agent mail`,
      "confirmation-required",
      "CONFIRM_SEND",
    )
  }
  const recentCount = countRecentAutonomousSends({
    recentOutbound: input.recentOutbound,
    nowMs: now.getTime(),
    windowMs: input.policy.rateLimit.windowMs,
  })
  if (recentCount >= input.policy.rateLimit.maxSends) {
    return blocked("autonomous-rate-limit", "Autonomous native-agent mail rate limit is exhausted")
  }
  return autonomyDecision({
    allowed: true,
    mode: "autonomous",
    code: "allowed",
    reason: "Autonomous native-agent mail policy allowed this send",
    evaluatedAt,
    recipients,
    fallback: "none",
    policyId,
    remainingSendsInWindow: Math.max(0, input.policy.rateLimit.maxSends - recentCount - 1),
  })
}

export function buildConfirmedMailSendDecision(input: BuildConfirmedMailSendDecisionInput): MailAutonomyDecision {
  const evaluatedAt = (input.now ?? new Date()).toISOString()
  return autonomyDecision({
    allowed: true,
    mode: "confirmed",
    code: "explicit-confirmation",
    reason: "Explicit confirmation authorized this native-agent send",
    evaluatedAt,
    recipients: outboundRecipients(input.draft),
    fallback: "none",
    ...(input.policy ? { policyId: input.policy.policyId } : {}),
  })
}

export function buildMailProviderSubmission(input: BuildMailProviderSubmissionInput): MailOutboundRecord {
  return {
    ...input.draft,
    status: "submitted",
    provider: input.provider,
    providerMessageId: input.providerMessageId,
    ...(input.providerRequestId ? { providerRequestId: input.providerRequestId } : {}),
    ...(input.operationLocation ? { operationLocation: input.operationLocation } : {}),
    submittedAt: input.submittedAt,
    updatedAt: input.submittedAt,
    deliveryEvents: [],
  }
}

function recordField(value: unknown, key: string): unknown {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)[key]
    : undefined
}

function stringField(value: unknown, key: string): string {
  const field = recordField(value, key)
  return typeof field === "string" ? field : ""
}

function acsOutcome(status: string): MailOutboundDeliveryEventOutcome {
  switch (status) {
    case "Delivered": return "delivered"
    case "Suppressed": return "suppressed"
    case "Bounced": return "bounced"
    case "Quarantined": return "quarantined"
    case "FilteredSpam": return "spam-filtered"
    case "Expanded": return "accepted"
    case "Failed": return "failed"
    default: throw new Error(`unsupported ACS delivery status: ${status || "unknown"}`)
  }
}

export function parseAcsEmailDeliveryReportEvent(event: unknown): MailOutboundDeliveryEvent {
  const providerEventId = stringField(event, "id")
  const eventType = stringField(event, "eventType")
  const data = recordField(event, "data")
  if (!providerEventId) throw new Error("ACS delivery event is missing id")
  if (eventType !== "Microsoft.Communication.EmailDeliveryReportReceived") {
    throw new Error(`unsupported ACS event type: ${eventType || "unknown"}`)
  }
  const providerMessageId = stringField(data, "messageId")
  const status = stringField(data, "status")
  if (!providerMessageId) throw new Error("ACS delivery event is missing messageId")
  const recipient = stringField(data, "recipient")
  const eventTime = stringField(event, "eventTime")
  const occurredAt = stringField(data, "deliveryAttemptTimeStamp") || eventTime || new Date().toISOString()
  const normalizedRecipient = recipient ? normalizeMailAddress(recipient) : ""
  return {
    schemaVersion: 1,
    provider: "azure-communication-services",
    providerEventId,
    providerMessageId,
    outcome: acsOutcome(status),
    ...(normalizedRecipient ? { recipient: normalizedRecipient } : {}),
    occurredAt,
    receivedAt: eventTime || occurredAt,
    bodySafeSummary: `ACS delivery report ${status} for ${normalizedRecipient || "unknown recipient"}`,
    providerStatus: status,
  }
}

export function reconcileMailDeliveryEvent(input: ReconcileMailDeliveryEventInput): MailOutboundRecord {
  if (input.outbound.providerMessageId && input.outbound.providerMessageId !== input.event.providerMessageId) {
    throw new Error("delivery event providerMessageId does not match outbound record")
  }
  const existingEvents = input.outbound.deliveryEvents ?? []
  if (existingEvents.some((event) => event.providerEventId === input.event.providerEventId)) {
    return input.outbound
  }
  const timestampKey = input.event.outcome === "delivered"
    ? "deliveredAt"
    : input.event.outcome === "accepted"
      ? "acceptedAt"
      : "failedAt"
  return {
    ...input.outbound,
    status: input.event.outcome,
    updatedAt: input.event.occurredAt,
    deliveryEvents: [...existingEvents, input.event],
    [timestampKey]: input.event.occurredAt,
  }
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

export function resolveMailAddress(registry: MailroomRegistry, address: string): ResolvedMailAddress | null {
  const normalized = normalizeMailAddress(address)
  const mailbox = registry.mailboxes.find((entry) => normalizeMailAddress(entry.canonicalAddress) === normalized)
  if (mailbox) {
    return {
      address: normalized,
      agentId: mailbox.agentId,
      mailboxId: mailbox.mailboxId,
      compartmentKind: "native",
      compartmentId: mailbox.mailboxId,
      keyId: mailbox.keyId,
      publicKeyPem: mailbox.publicKeyPem,
      defaultPlacement: mailbox.defaultPlacement,
    }
  }

  const grant = registry.sourceGrants.find((entry) => normalizeMailAddress(entry.aliasAddress) === normalized)
  if (!grant || !grant.enabled) return null
  const owningMailbox = registry.mailboxes.find((entry) => entry.agentId === grant.agentId)
  if (!owningMailbox) {
    throw new Error(`Source grant ${grant.grantId} has no owning mailbox for agent ${grant.agentId}`)
  }
  return {
    address: normalized,
    agentId: grant.agentId,
    mailboxId: owningMailbox.mailboxId,
    compartmentKind: "delegated",
    compartmentId: grant.grantId,
    grantId: grant.grantId,
    ownerEmail: normalizeMailAddress(grant.ownerEmail),
    source: grant.source,
    keyId: grant.keyId,
    publicKeyPem: grant.publicKeyPem,
    defaultPlacement: grant.defaultPlacement,
  }
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

function normalizedIngestProvenance(input?: MailIngestProvenance): MailIngestProvenance {
  return input ?? { schemaVersion: 1, kind: "smtp" }
}

export function buildStoredMailMessage(input: {
  resolved: ResolvedMailAddress
  envelope: MailEnvelopeInput
  rawMime: Buffer
  privateEnvelope: PrivateMailEnvelope
  receivedAt?: Date
  ingest?: MailIngestProvenance
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
    ingest: normalizedIngestProvenance(input.ingest),
    receivedAt,
  }
  const sender = candidateSender({ privateEnvelope: input.privateEnvelope, envelope: input.envelope })
  const shouldCreateCandidate = input.classification?.candidate ?? placement === "screener"
  const candidate: MailScreenerCandidate | undefined = shouldCreateCandidate
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
    mailboxes: registry.mailboxes.map((mailbox) => ({ ...mailbox })),
    sourceGrants: registry.sourceGrants.map((grant) => ({ ...grant })),
    ...(registry.senderPolicies ? { senderPolicies: registry.senderPolicies.map((policy) => ({ ...policy })) } : {}),
  }
}

function requireExistingPrivateKey(keys: Record<string, string>, keyId: string, label: string): void {
  if (keys[keyId]) return
  throw new Error(`Mailroom registry references ${keyId} for ${label}, but the private key is missing`)
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
}): MailroomEnsureResult {
  const domain = (input.registry?.domain ?? input.domain ?? "ouro.bot").toLowerCase()
  const agentId = safeAddressPart(input.agentId) || "agent"
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
      requireExistingPrivateKey(keys, mailbox.keyId, `mailbox ${mailbox.canonicalAddress}`)
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
        requireExistingPrivateKey(keys, existing.keyId, `source grant ${existing.aliasAddress}`)
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

export function rotatePublicMailboxRegistryKeys(input: {
  agentId: string
  domain?: string
  registry?: MailroomRegistry
  ownerEmail?: string
  source?: string
  sourceTag?: string
  rotateMailbox?: boolean
  rotateSourceGrant?: boolean
}): MailroomPublicRotateResult {
  const rotateMailbox = input.rotateMailbox === true
  const rotateSourceGrant = input.rotateSourceGrant === true
  if (!rotateMailbox && !rotateSourceGrant) {
    throw new Error("at least one key rotation target is required")
  }
  if (rotateSourceGrant && !input.ownerEmail) {
    throw new Error("ownerEmail is required when rotating a source grant key")
  }

  const ensured = ensurePublicMailboxRegistry(input)
  const domain = ensured.registry.domain
  const agentId = safeAddressPart(input.agentId) || "agent"
  const registry = cloneMailroomRegistry(ensured.registry, domain)
  const generatedPrivateKeys = { ...ensured.generatedPrivateKeys }
  let rotatedMailbox = false
  let rotatedSourceGrant = false

  if (rotateMailbox && !ensured.addedMailbox) {
    const mailbox = registry.mailboxes.find((entry) => entry.agentId === agentId)!
    const nextKey = generateMailKeyPair(`${agentId}-native`)
    mailbox.keyId = nextKey.keyId
    mailbox.publicKeyPem = nextKey.publicKeyPem
    generatedPrivateKeys[nextKey.keyId] = nextKey.privateKeyPem
    rotatedMailbox = true
  }

  if (rotateSourceGrant) {
    const ownerEmail = normalizeMailAddress(input.ownerEmail!)
    const source = (input.source?.trim() || "hey").toLowerCase()
    if (!ensured.addedSourceGrant) {
      const sourceGrant = registry.sourceGrants.find((grant) =>
        grant.agentId === agentId &&
        normalizeMailAddress(grant.ownerEmail) === ownerEmail &&
        grant.source.toLowerCase() === source)!
      const nextKey = generateMailKeyPair(`${agentId}-${source}`)
      sourceGrant.keyId = nextKey.keyId
      sourceGrant.publicKeyPem = nextKey.publicKeyPem
      generatedPrivateKeys[nextKey.keyId] = nextKey.privateKeyPem
      rotatedSourceGrant = true
    }
  }

  return {
    ...ensured,
    registry,
    keys: generatedPrivateKeys,
    generatedPrivateKeys,
    rotatedMailbox,
    rotatedSourceGrant,
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

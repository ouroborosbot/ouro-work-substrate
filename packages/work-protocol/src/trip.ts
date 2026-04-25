// Typed trip ledger for the work substrate.
//
// Slugger's framing: today, doc-edits-from-mail keep falling back on freeform
// parsing because there is no structured object between "mail body" and
// "travel doc". This module defines the structured object — a Trip with typed
// Legs that the agent updates from mail evidence — so the travel doc can be
// rendered from the ledger instead of hand-edited from vibes.
//
// Trust shape mirrors mail:
//   - hosted side publishes the per-agent ledger public key in a registry
//   - private key returned exactly once at ensure() time, then never again
//   - every TripRecord stored encrypted with the agent's ledger key
//   - hosted side never sees plaintext trip facts
//
// Encryption helpers are reused from ./mail (same RSA-OAEP+AES-256-GCM
// envelope) — re-exported here under trip names for callsite legibility.

import * as crypto from "node:crypto"
import {
  decryptMailJson,
  encryptJsonForMailKey,
  safeAddressPart,
  stableJson,
  type EncryptedPayload,
} from "./mail"

// ── Status + leg taxonomy ──────────────────────────────────────────

export type TripStatus = "planned" | "confirmed" | "in-progress" | "completed" | "cancelled"

/**
 * The narrow set of leg shapes a real trip ledger needs. We start with the
 * shapes Slugger explicitly named; new variants are additive (new union arm,
 * new helper). A more general "event" arm catches anything not covered yet.
 *
 * RentalCar is intentionally its own kind — confirmation tokens are a distinct
 * shape (often vendor-prefixed like "XCDR/123456789"), pickup/dropoff locations
 * are not the same as the trip destination, and the vendor (Hertz / Sixt /
 * Enterprise) is material to the plan. Folding it into ground-transport loses
 * signal the agent needs when reasoning about the leg.
 */
export type LegKind = "lodging" | "flight" | "train" | "ground-transport" | "rental-car" | "ferry" | "event"

/**
 * Per-leg status. Distinct from TripStatus because a single trip can hold a
 * cancelled flight and a confirmed hotel at the same time.
 */
export type LegStatus = "tentative" | "confirmed" | "changed" | "cancelled" | "refunded"

// ── Shared types ───────────────────────────────────────────────────

export interface TripParty {
  name: string
  // Optional handle into the agent's friend store. Lets the agent join
  // ledger entries to friend identities without storing addresses here.
  externalId?: string
}

export interface TripMoney {
  value: number
  currency: string
}

/**
 * How a piece of evidence came to be attached to a leg.
 *   - `extracted`         — pulled directly from a primary source (a booking
 *                           confirmation mail, an itinerary doc). Highest trust.
 *   - `inferred`          — derived by reasoning over other facts (e.g. "check-in
 *                           is the day after the flight because no explicit
 *                           check-in date was in the mail"). Useful but should
 *                           not silently overwrite an extracted fact in conflict.
 *   - `operator_supplied` — the human told the agent directly. Treated as truth
 *                           but distinct in the audit trail from a mail-grounded
 *                           extraction.
 *
 * Required so every fact on the ledger is honest about its provenance class.
 */
export type EvidenceDiscoveryMethod = "extracted" | "inferred" | "operator_supplied"

/**
 * A single piece of evidence that contributed to a fact on a leg. Provenance
 * is non-optional so the agent can always cite which message a fact came from
 * (or that the fact was inferred / operator-supplied) when updating the
 * rendered doc or when reasoning about a contradiction.
 */
export interface TripEvidence {
  messageId: string
  reason: string
  recordedAt: string
  discoveryMethod: EvidenceDiscoveryMethod
  excerpt?: string
}

interface TripLegBase {
  legId: string
  kind: LegKind
  status: LegStatus
  vendor?: string
  confirmationCode?: string
  amount?: TripMoney
  passengers?: TripParty[]
  notes?: string
  evidence: TripEvidence[]
  createdAt: string
  updatedAt: string
}

export interface LodgingLeg extends TripLegBase {
  kind: "lodging"
  city?: string
  checkInDate?: string
  checkOutDate?: string
}

export interface FlightLeg extends TripLegBase {
  kind: "flight"
  origin?: string
  destination?: string
  departureAt?: string
  arrivalAt?: string
  flightNumber?: string
}

export interface TrainLeg extends TripLegBase {
  kind: "train"
  originStation?: string
  destinationStation?: string
  departureAt?: string
  arrivalAt?: string
  trainNumber?: string
}

export interface GroundTransportLeg extends TripLegBase {
  kind: "ground-transport"
  origin?: string
  destination?: string
  departureAt?: string
  arrivalAt?: string
  operator?: string
}

export interface RentalCarLeg extends TripLegBase {
  kind: "rental-car"
  rentalVendor?: string
  pickupLocation?: string
  dropoffLocation?: string
  pickupAt?: string
  dropoffAt?: string
}

export interface FerryLeg extends TripLegBase {
  kind: "ferry"
  originPort?: string
  destinationPort?: string
  departureAt?: string
  arrivalAt?: string
  operator?: string
}

export interface EventLeg extends TripLegBase {
  kind: "event"
  city?: string
  venue?: string
  startsAt?: string
  endsAt?: string
}

export type TripLeg = LodgingLeg | FlightLeg | TrainLeg | GroundTransportLeg | RentalCarLeg | FerryLeg | EventLeg

// ── Trip + registry records ────────────────────────────────────────

export interface TripRecord {
  schemaVersion: 1
  tripId: string
  agentId: string
  ownerEmail: string
  name: string
  status: TripStatus
  startDate?: string
  endDate?: string
  travellers: TripParty[]
  legs: TripLeg[]
  notes?: string
  createdAt: string
  updatedAt: string
}

/**
 * Public-facing pointer for one agent's trip ledger. The hosted registry
 * lists these so a caller can fetch the public key without unwrapping
 * private state. There is exactly one ledger per agent in v1; new
 * versions could shard further.
 */
export interface AgentTripLedgerRecord {
  agentId: string
  ledgerId: string
  keyId: string
  publicKeyPem: string
  createdAt: string
}

export interface TripLedgerRegistry {
  schemaVersion: 1
  ledgers: AgentTripLedgerRecord[]
}

export interface TripKeyPair {
  keyId: string
  publicKeyPem: string
  privateKeyPem: string
}

export interface TripLedgerEnsureResult {
  registry: TripLedgerRegistry
  ledger: AgentTripLedgerRecord
  added: boolean
  /** Returned only on the call that created the ledger; subsequent calls return undefined. */
  generatedPrivateKeyPem?: string
}

// ── Helpers: keys + crypto ─────────────────────────────────────────

export function generateTripKeyPair(label: string): TripKeyPair {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  })
  const safeLabel = safeAddressPart(label) || "ledger"
  const fingerprint = crypto.createHash("sha256").update(publicKey).digest("hex").slice(0, 16)
  return {
    keyId: `trip_${safeLabel}_${fingerprint}`,
    publicKeyPem: publicKey,
    privateKeyPem: privateKey,
  }
}

export function encryptTripRecord(trip: TripRecord, publicKeyPem: string, keyId: string): EncryptedPayload {
  return encryptJsonForMailKey(trip, publicKeyPem, keyId)
}

export function decryptTripRecord(payload: EncryptedPayload, privateKeyPem: string): TripRecord {
  return decryptMailJson<TripRecord>(payload, privateKeyPem)
}

// ── Helpers: deterministic ids ─────────────────────────────────────

/**
 * Deterministic trip id from agentId + name + createdAt so that an idempotent
 * ensure-trip caller does not duplicate trips for the same logical entry.
 */
export function newTripId(agentId: string, name: string, createdAt: string): string {
  const fingerprint = crypto.createHash("sha256")
    .update(`${agentId}\n${name}\n${createdAt}`)
    .digest("hex")
    .slice(0, 16)
  const slug = safeAddressPart(name) || "trip"
  return `trip_${slug}_${fingerprint}`
}

/**
 * Deterministic leg id from tripId + kind + (vendor or confirmation) + createdAt.
 * Falls back to a random suffix when no distinguishing field is present, so
 * placeholder legs don't collide.
 */
export function newLegId(input: {
  tripId: string
  kind: LegKind
  vendor?: string
  confirmationCode?: string
  createdAt: string
}): string {
  const distinguish = input.vendor || input.confirmationCode || crypto.randomUUID()
  const fingerprint = crypto.createHash("sha256")
    .update(`${input.tripId}\n${input.kind}\n${distinguish}\n${input.createdAt}`)
    .digest("hex")
    .slice(0, 16)
  return `leg_${input.kind}_${fingerprint}`
}

// ── Helpers: registry mutators ─────────────────────────────────────

export function findAgentTripLedger(registry: TripLedgerRegistry, agentId: string): AgentTripLedgerRecord | null {
  const match = registry.ledgers.find((entry) => entry.agentId === agentId)
  return match ?? null
}

export interface EnsureAgentTripLedgerInput {
  agentId: string
  /** Human-friendly label — surfaced in the keyId for legibility. */
  label?: string
  /** Override clock for tests. */
  now?: () => string
}

/**
 * Idempotent: if the agent already has a ledger, returns it untouched.
 * Otherwise generates a fresh keypair, appends the public record to the
 * registry, and returns the private key exactly once.
 *
 * The returned `registry` is a fresh object — callers should persist it.
 */
export function ensureAgentTripLedger(
  registry: TripLedgerRegistry,
  input: EnsureAgentTripLedgerInput,
): TripLedgerEnsureResult {
  const existing = findAgentTripLedger(registry, input.agentId)
  if (existing) {
    return { registry, ledger: existing, added: false }
  }
  const now = (input.now ?? (() => new Date().toISOString()))()
  const keypair = generateTripKeyPair(input.label ?? input.agentId)
  const ledger: AgentTripLedgerRecord = {
    agentId: input.agentId,
    ledgerId: `ledger_${safeAddressPart(input.agentId) || "agent"}_${crypto.createHash("sha256").update(`${input.agentId}\n${now}\n${keypair.keyId}`).digest("hex").slice(0, 16)}`,
    keyId: keypair.keyId,
    publicKeyPem: keypair.publicKeyPem,
    createdAt: now,
  }
  return {
    registry: {
      ...registry,
      ledgers: [...registry.ledgers, ledger],
    },
    ledger,
    added: true,
    generatedPrivateKeyPem: keypair.privateKeyPem,
  }
}

/**
 * Fresh, empty registry. Tests + first-time bootstrap call this; in production
 * the registry blob is created on first ensure() write.
 */
export function emptyTripLedgerRegistry(): TripLedgerRegistry {
  return { schemaVersion: 1, ledgers: [] }
}

/**
 * Stable JSON for canonical hashing / etag comparison of registry contents.
 * Exposed so a hosted store can compute a deterministic revision string.
 */
export function tripLedgerRegistryRevision(registry: TripLedgerRegistry): string {
  const json = stableJson(registry)
  const fingerprint = crypto.createHash("sha256").update(json).digest("hex").slice(0, 16)
  return `${registry.ledgers.length}:${fingerprint}`
}

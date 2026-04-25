import * as fs from "node:fs"
import * as path from "node:path"
import {
  emptyTripLedgerRegistry,
  ensureAgentTripLedger,
  tripLedgerRegistryRevision,
  type AgentTripLedgerRecord,
  type EncryptedPayload,
  type TripLedgerRegistry,
} from "@ouro/work-protocol"

export interface EnsureLedgerInput {
  agentId: string
  label?: string
}

export interface EnsureLedgerResult {
  ledger: AgentTripLedgerRecord
  added: boolean
  /** Returned only on the call that created the ledger; subsequent calls return undefined. */
  generatedPrivateKeyPem?: string
  registryRevision: string
}

export interface UpsertTripInput {
  agentId: string
  tripId: string
  payload: EncryptedPayload
}

export interface GetTripResult {
  payload: EncryptedPayload
}

export interface ListTripsResult {
  agentId: string
  tripIds: string[]
}

/**
 * Hosted store for trip ledgers. Two surfaces:
 *   - registry (one blob, holds public AgentTripLedgerRecord per agent)
 *   - per-trip blobs (encrypted TripRecord JSON, keyed by agentId+tripId)
 *
 * Implementations must guarantee:
 *   - ensureLedger is idempotent on agentId
 *   - ensureLedger returns the freshly generated private key exactly once
 *   - upsertTrip / getTrip are scoped to the calling agentId; cross-agent
 *     reads / writes are not part of this surface (callers enforce auth)
 */
export interface TripLedgerStore {
  readRegistry(): Promise<{ registry: TripLedgerRegistry; revision: string }>
  ensureLedger(input: EnsureLedgerInput): Promise<EnsureLedgerResult>
  upsertTrip(input: UpsertTripInput): Promise<{ revision: string }>
  getTrip(input: { agentId: string; tripId: string }): Promise<GetTripResult>
  listTrips(input: { agentId: string }): Promise<ListTripsResult>
}

const REGISTRY_FILENAME = "trip-ledgers.json"
const TRIPS_DIR = "trips"

function readJson<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T
}

function writeJsonAtomic(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  const tmp = `${filePath}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), "utf-8")
  fs.renameSync(tmp, filePath)
}

/**
 * Trip not found in store. Distinct error class so the server can map it to
 * a 404 without parsing message text.
 */
export class TripNotFoundError extends Error {
  readonly statusCode = 404
  constructor(input: { agentId: string; tripId: string }) {
    super(`trip not found: agent=${input.agentId} trip=${input.tripId}`)
  }
}

export class FileTripLedgerStore implements TripLedgerStore {
  constructor(private readonly rootDir: string) {}

  private registryPath(): string {
    return path.join(this.rootDir, REGISTRY_FILENAME)
  }

  private tripPath(agentId: string, tripId: string): string {
    return path.join(this.rootDir, TRIPS_DIR, agentId, `${tripId}.json`)
  }

  private agentTripsDir(agentId: string): string {
    return path.join(this.rootDir, TRIPS_DIR, agentId)
  }

  async readRegistry(): Promise<{ registry: TripLedgerRegistry; revision: string }> {
    const stored = readJson<TripLedgerRegistry>(this.registryPath()) ?? emptyTripLedgerRegistry()
    return { registry: stored, revision: tripLedgerRegistryRevision(stored) }
  }

  async ensureLedger(input: EnsureLedgerInput): Promise<EnsureLedgerResult> {
    const { registry } = await this.readRegistry()
    const result = ensureAgentTripLedger(registry, {
      agentId: input.agentId,
      ...(input.label ? { label: input.label } : {}),
    })
    if (result.added) {
      writeJsonAtomic(this.registryPath(), result.registry)
    }
    return {
      ledger: result.ledger,
      added: result.added,
      ...(result.generatedPrivateKeyPem ? { generatedPrivateKeyPem: result.generatedPrivateKeyPem } : {}),
      registryRevision: tripLedgerRegistryRevision(result.registry),
    }
  }

  async upsertTrip(input: UpsertTripInput): Promise<{ revision: string }> {
    writeJsonAtomic(this.tripPath(input.agentId, input.tripId), input.payload)
    return { revision: input.payload.keyId }
  }

  async getTrip(input: { agentId: string; tripId: string }): Promise<GetTripResult> {
    const payload = readJson<EncryptedPayload>(this.tripPath(input.agentId, input.tripId))
    if (!payload) throw new TripNotFoundError(input)
    return { payload }
  }

  async listTrips(input: { agentId: string }): Promise<ListTripsResult> {
    const dir = this.agentTripsDir(input.agentId)
    if (!fs.existsSync(dir)) return { agentId: input.agentId, tripIds: [] }
    const tripIds = fs.readdirSync(dir)
      .filter((entry) => entry.endsWith(".json"))
      .map((entry) => entry.slice(0, -".json".length))
      .sort()
    return { agentId: input.agentId, tripIds }
  }
}

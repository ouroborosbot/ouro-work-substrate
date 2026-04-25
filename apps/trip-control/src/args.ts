// CLI arg parser for ouro-trip-control. Mirrors the shape of mail-control's
// args parser: explicit named flags only, no env var fallback for the durable
// contract (env vars are short-lived; flags are auditable in the deploy spec).

export interface TripControlArgs {
  storePath: string
  adminToken?: string
  adminTokenFile?: string
  host: string
  port: number
  rateLimitWindowMs: number
  rateLimitMax: number
  allowUnauthenticatedLocal: boolean
}

const DEFAULTS = {
  host: "0.0.0.0",
  port: 8080,
  rateLimitWindowMs: 60_000,
  rateLimitMax: 60,
}

function readFlag(args: string[], name: string): string | undefined {
  const idx = args.indexOf(name)
  if (idx === -1) return undefined
  return args[idx + 1]
}

function hasFlag(args: string[], name: string): boolean {
  return args.includes(name)
}

function parseIntegerFlag(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer`)
  }
  return parsed
}

export function parseTripControlArgs(args: string[] = process.argv.slice(2)): TripControlArgs {
  const storePath = readFlag(args, "--store")
  if (!storePath) {
    throw new Error("--store <path> is required (file-backed trip ledger root directory)")
  }
  const adminToken = readFlag(args, "--admin-token")
  const adminTokenFile = readFlag(args, "--admin-token-file")
  const allowUnauthenticatedLocal = hasFlag(args, "--allow-unauthenticated-local")
  if (!adminToken && !adminTokenFile && !allowUnauthenticatedLocal) {
    throw new Error("either --admin-token, --admin-token-file, or --allow-unauthenticated-local is required")
  }

  return {
    storePath,
    ...(adminToken ? { adminToken } : {}),
    ...(adminTokenFile ? { adminTokenFile } : {}),
    host: readFlag(args, "--host") ?? DEFAULTS.host,
    port: parseIntegerFlag(readFlag(args, "--port"), DEFAULTS.port, "--port"),
    rateLimitWindowMs: parseIntegerFlag(readFlag(args, "--rate-limit-window-ms"), DEFAULTS.rateLimitWindowMs, "--rate-limit-window-ms"),
    rateLimitMax: parseIntegerFlag(readFlag(args, "--rate-limit-max"), DEFAULTS.rateLimitMax, "--rate-limit-max"),
    allowUnauthenticatedLocal,
  }
}

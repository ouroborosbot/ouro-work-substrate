import * as fs from "node:fs"

export interface MailControlArgs {
  azureAccountUrl?: string
  storePath?: string
  azureManagedIdentityClientId?: string
  registryContainer: string
  registryBlob: string
  registryDomain: string
  adminToken?: string
  adminTokenFile?: string
  allowedEmailDomain: string
  host: string
  port: number
  rateLimitWindowMs: number
  rateLimitMax: number
  allowUnauthenticatedLocal: boolean
}

const KEY_VALUE_ARGS = new Map([
  ["azure-account-url", "--azure-account-url"],
  ["store", "--store"],
  ["azure-managed-identity-client-id", "--azure-managed-identity-client-id"],
  ["registry-container", "--registry-container"],
  ["registry-blob", "--registry-blob"],
  ["registry-domain", "--registry-domain"],
  ["admin-token-file", "--admin-token-file"],
  ["allowed-email-domain", "--allowed-email-domain"],
  ["host", "--host"],
  ["port", "--port"],
  ["rate-limit-window-ms", "--rate-limit-window-ms"],
  ["rate-limit-max", "--rate-limit-max"],
  ["allow-unauthenticated-local", "--allow-unauthenticated-local"],
])

function expandKeyValueArgs(args: string[]): string[] {
  const expanded: string[] = []
  for (const arg of args) {
    const equalsIndex = arg.indexOf("=")
    if (!arg.startsWith("--") && equalsIndex > 0) {
      const key = arg.slice(0, equalsIndex).trim()
      const flag = KEY_VALUE_ARGS.get(key)
      if (flag) {
        expanded.push(flag, arg.slice(equalsIndex + 1))
        continue
      }
    }
    expanded.push(arg)
  }
  return expanded
}

function optionalValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag)
  return index === -1 ? undefined : args[index + 1]
}

function optionalNumber(args: string[], flag: string, fallback: number): number {
  const index = args.indexOf(flag)
  if (index === -1) return fallback
  const value = Number.parseInt(args[index + 1] ?? "", 10)
  if (!Number.isInteger(value) || value < 0) throw new Error(`${flag} must be a non-negative integer`)
  return value
}

function optionalPort(args: string[], flag: string, fallback: number): number {
  const value = optionalNumber(args, flag, fallback)
  if (value > 65535) throw new Error(`${flag} must be a TCP port`)
  return value
}

export function parseMailControlArgs(args: string[]): MailControlArgs {
  const expanded = expandKeyValueArgs(args)
  const azureAccountUrl = optionalValue(expanded, "--azure-account-url")
  const storePath = optionalValue(expanded, "--store")
  if (!azureAccountUrl && !storePath) throw new Error("Missing --azure-account-url or --store")
  const adminTokenFile = optionalValue(expanded, "--admin-token-file")
  const allowUnauthenticatedLocal = expanded.includes("--allow-unauthenticated-local")
  const adminToken = adminTokenFile ? fs.readFileSync(adminTokenFile, "utf-8").trim() : undefined
  if (!adminToken && !allowUnauthenticatedLocal) {
    throw new Error("Missing --admin-token-file. Use --allow-unauthenticated-local only for local development.")
  }
  return {
    ...(azureAccountUrl ? { azureAccountUrl } : {}),
    ...(storePath ? { storePath } : {}),
    ...(optionalValue(expanded, "--azure-managed-identity-client-id")
      ? { azureManagedIdentityClientId: optionalValue(expanded, "--azure-managed-identity-client-id") }
      : {}),
    registryContainer: optionalValue(expanded, "--registry-container") ?? "mailroom",
    registryBlob: optionalValue(expanded, "--registry-blob") ?? "registry/mailroom.json",
    registryDomain: optionalValue(expanded, "--registry-domain") ?? "ouro.bot",
    ...(adminTokenFile ? { adminTokenFile } : {}),
    ...(adminToken ? { adminToken } : {}),
    allowedEmailDomain: (optionalValue(expanded, "--allowed-email-domain") ?? "ouro.bot").toLowerCase(),
    host: optionalValue(expanded, "--host") ?? "0.0.0.0",
    port: optionalPort(expanded, "--port", 8080),
    rateLimitWindowMs: optionalNumber(expanded, "--rate-limit-window-ms", 60_000),
    rateLimitMax: optionalNumber(expanded, "--rate-limit-max", 60),
    allowUnauthenticatedLocal,
  }
}


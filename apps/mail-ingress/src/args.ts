import * as fs from "node:fs"
import type { MailroomRegistry } from "@ouro/work-protocol"

export interface MailIngressArgs {
  registryPath?: string
  registryBase64?: string
  storePath?: string
  azureAccountUrl?: string
  azureContainer: string
  azureManagedIdentityClientId?: string
  smtpPort: number
  httpPort: number
  host: string
  maxMessageBytes: number
}

const KEY_VALUE_ARGS = new Map([
  ["registry", "--registry"],
  ["registry-base64", "--registry-base64"],
  ["store", "--store"],
  ["azure-account-url", "--azure-account-url"],
  ["azure-container", "--azure-container"],
  ["azure-managed-identity-client-id", "--azure-managed-identity-client-id"],
  ["smtp-port", "--smtp-port"],
  ["http-port", "--http-port"],
  ["host", "--host"],
  ["max-message-bytes", "--max-message-bytes"],
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
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${flag} must be a non-negative integer`)
  }
  return value
}

function optionalPort(args: string[], flag: string, fallback: number): number {
  const value = optionalNumber(args, flag, fallback)
  if (value > 65535) throw new Error(`${flag} must be a TCP port`)
  return value
}

export function parseMailIngressArgs(args: string[]): MailIngressArgs {
  const expanded = expandKeyValueArgs(args)
  const storePath = optionalValue(expanded, "--store")
  const azureAccountUrl = optionalValue(expanded, "--azure-account-url")
  if (!storePath && !azureAccountUrl) {
    throw new Error("Missing --store or --azure-account-url")
  }
  const registryPath = optionalValue(expanded, "--registry")
  const registryBase64 = optionalValue(expanded, "--registry-base64")
  if (!registryPath && !registryBase64) {
    throw new Error("Missing --registry or --registry-base64")
  }
  return {
    ...(registryPath ? { registryPath } : {}),
    ...(registryBase64 ? { registryBase64 } : {}),
    ...(storePath ? { storePath } : {}),
    ...(azureAccountUrl ? { azureAccountUrl } : {}),
    azureContainer: optionalValue(expanded, "--azure-container") ?? "mailroom",
    ...(optionalValue(expanded, "--azure-managed-identity-client-id")
      ? { azureManagedIdentityClientId: optionalValue(expanded, "--azure-managed-identity-client-id") }
      : {}),
    smtpPort: optionalPort(expanded, "--smtp-port", 2525),
    httpPort: optionalPort(expanded, "--http-port", 8080),
    host: optionalValue(expanded, "--host") ?? "0.0.0.0",
    maxMessageBytes: optionalNumber(expanded, "--max-message-bytes", 25 * 1024 * 1024),
  }
}

export function readRegistry(args: Pick<MailIngressArgs, "registryPath" | "registryBase64">): MailroomRegistry {
  if (args.registryBase64) {
    return JSON.parse(Buffer.from(args.registryBase64, "base64").toString("utf-8")) as MailroomRegistry
  }
  if (!args.registryPath) throw new Error("Missing registry path")
  return JSON.parse(fs.readFileSync(args.registryPath, "utf-8")) as MailroomRegistry
}


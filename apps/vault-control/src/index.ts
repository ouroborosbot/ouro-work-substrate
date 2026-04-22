import { parseVaultControlArgs } from "./args"
import { startVaultControlServer } from "./server"

export function runVaultControl(args: string[] = process.argv.slice(2)): ReturnType<typeof startVaultControlServer> {
  const parsed = parseVaultControlArgs(args)
  return startVaultControlServer({
    vaultServerUrl: parsed.vaultServerUrl,
    ...(parsed.adminToken ? { adminToken: parsed.adminToken } : {}),
    ...(parsed.adminTokenFile ? { adminTokenFile: parsed.adminTokenFile } : {}),
    allowedEmailDomain: parsed.allowedEmailDomain,
    rateLimitWindowMs: parsed.rateLimitWindowMs,
    rateLimitMax: parsed.rateLimitMax,
    allowUnauthenticatedLocal: parsed.allowUnauthenticatedLocal,
    host: parsed.host,
    port: parsed.port,
  })
}

if (require.main === module) {
  runVaultControl()
}

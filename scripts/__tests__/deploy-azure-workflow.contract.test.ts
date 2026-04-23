import * as fs from "node:fs"
import * as path from "node:path"
import { describe, expect, it } from "vitest"

function readFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf-8")
}

describe("Deploy Azure workflow production SMTP port contract", () => {
  it("keeps the production SMTP fallback on public port 25", () => {
    const workflow = readFile(".github/workflows/deploy-azure.yml")
    const bicep = readFile("infra/azure/main.bicep")

    expect(workflow).toContain('default: "25"')
    expect(workflow).toContain("vars.AZURE_MAIL_EXPOSED_SMTP_PORT || '25'")
    expect(workflow).not.toContain("vars.AZURE_MAIL_EXPOSED_SMTP_PORT || '2525'")
    expect(bicep).toContain("param mailExposedSmtpPort int = 25")
  })

  it("documents the repo variable as required production state", () => {
    const operations = readFile("docs/operations.md")

    expect(operations).toContain("Required for production MX: `AZURE_MAIL_EXPOSED_SMTP_PORT=25`")
    expect(operations).toContain("Nonstandard exposed SMTP ports are diagnostic-only and must not back an MX record.")
  })
})

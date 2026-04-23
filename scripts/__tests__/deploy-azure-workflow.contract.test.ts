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

  it("keeps outbound ACS email resources and Event Grid delivery reports in the deployable Azure shape", () => {
    const workflow = readFile(".github/workflows/deploy-azure.yml")
    const bicep = readFile("infra/azure/main.bicep")
    const operations = readFile("docs/operations.md")

    expect(workflow).toContain("az provider register --namespace \"$namespace\" --wait")
    expect(workflow).toContain("az provider show --namespace \"$namespace\" --query registrationState -o tsv")
    expect(workflow).toContain("ensure_provider Microsoft.Communication")
    expect(workflow).toContain("ensure_provider Microsoft.EventGrid")
    expect(workflow).toContain("current_state")
    expect(workflow).toContain("if [[ \"$current_state\" != \"Registered\" ]]")
    expect(workflow).toContain("register_requested")

    expect(bicep).toContain("Microsoft.Communication/emailServices@2026-03-18")
    expect(bicep).toContain("Microsoft.Communication/emailServices/domains@2026-03-18")
    expect(bicep).toContain("Microsoft.Communication/communicationServices@2024-09-01-preview")
    expect(bicep).toContain("outboundEmailLinkVerifiedDomain bool = false")
    expect(bicep).toContain("outboundEmailDomainVerificationRecords")
    expect(bicep).toContain("outboundDeliveryEventSubscriptionName")
    expect(bicep).not.toContain("Microsoft.EventGrid/eventSubscriptions@2025-02-15")

    expect(workflow).toContain("Determine outbound verified-domain link state")
    expect(workflow).toContain("outbound_email_link_verified_domain")
    expect(workflow).toContain("outboundEmailLinkVerifiedDomain=")
    expect(workflow).toContain("verificationStates")
    expect(workflow).toContain("linked only after DNS verification is complete")
    expect(workflow).toContain("az eventgrid event-subscription show")
    expect(workflow).toContain("az eventgrid event-subscription create")
    expect(workflow).toContain("az eventgrid event-subscription delete")
    expect(workflow).toContain("Microsoft.Communication.EmailDeliveryReportReceived")
    expect(workflow).toContain("/v1/outbound/events/azure-communication-services")

    expect(operations).toContain("Outbound native-agent mail uses Azure Communication Services Email")
    expect(operations).toContain("ordinary Slugger vault item")
    expect(operations).toContain("code must read only the explicit `credentialItem` and `credentialFields` binding")
    expect(operations).toContain("outbound-events/unmatched/")
    expect(operations).toContain("The deploy workflow first checks `Microsoft.Communication` and `Microsoft.EventGrid`")
    expect(operations).toContain("The deploy identity only needs subscription-level register permission when a provider is still unregistered.")
    expect(operations).toContain("The Event Grid delivery subscription is created by the deploy workflow")
    expect(operations).toContain("preserves the linked domain once verification is complete")
    expect(operations).toContain("Domain, SPF, DKIM, and DKIM2")
  })
})

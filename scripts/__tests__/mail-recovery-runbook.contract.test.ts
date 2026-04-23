import * as fs from "node:fs"
import * as path from "node:path"
import { describe, expect, it } from "vitest"

function readDoc(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf-8")
}

describe("mail recovery runbook documentation contract", () => {
  it("keeps a first-class recovery map linked from operations", () => {
    const operations = readDoc("docs/operations.md")
    const recovery = readDoc("docs/mail-recovery-runbook.md")

    expect(operations).toContain("docs/mail-recovery-runbook.md")
    expect(recovery).toContain("## Recovery Map")
    expect(recovery).toContain("Agent-runnable")
    expect(recovery).toContain("Human-required")
    expect(recovery).toContain("Body-safe evidence")

    for (const term of [
      "DNS/MX drift",
      "port 25 or STARTTLS failure",
      "hosted registry/vault key drift",
      "Blob reader or decryption failure",
      "wrong mailbox provenance",
      "HEY export/backfill stale",
      "HEY forwarding missing or lossy",
      "delivery event missing",
      "autonomy kill switch",
      "discarded/quarantined recovery",
    ]) {
      expect(recovery).toContain(term)
    }
  })

  it("points each failure mode to the real production surfaces without secret leakage", () => {
    const recovery = readDoc("docs/mail-recovery-runbook.md")

    for (const term of [
      "infra/dns/ouro.bot.binding.json",
      "gh run list --repo ouroborosbot/ouro-work-substrate",
      "gh workflow run deploy-azure.yml --repo ouroborosbot/ouro-work-substrate",
      "az containerapp revision list",
      "GET /health",
      "POST /v1/mailboxes/ensure",
      "POST /v1/mailboxes/rotate-keys",
      "ouro account ensure --rotate-missing-mail-keys",
      "ouro account ensure",
      "ouro connect mail",
      "ouro mail import-mbox",
      "mail_recent",
      "mail_screener",
      "mail_access_log",
      "Ouro Outlook",
      "Event Grid",
      "Azure Communication Services",
      "mailroom.autonomousSendPolicy",
      "Do not parse vault item notes",
    ]) {
      expect(recovery).toContain(term)
    }

    expect(recovery).toContain("never paste provider keys, TLS private keys, raw MIME, message bodies, private mail keys, or vault unlock material")
    expect(recovery).toContain("rotation cannot recover mail already encrypted to a lost private key")
  })
})

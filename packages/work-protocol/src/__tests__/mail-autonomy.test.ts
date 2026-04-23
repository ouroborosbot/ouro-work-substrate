import { describe, expect, it } from "vitest"
import {
  buildNativeMailAutonomyPolicy,
  evaluateNativeMailSendPolicy,
  type MailAutonomyPolicy,
  type MailOutboundRecord,
} from "../mail"

const actor = { kind: "human" as const, friendId: "ari", trustLevel: "family" as const }

function policy(overrides: Partial<MailAutonomyPolicy> = {}): MailAutonomyPolicy {
  return buildNativeMailAutonomyPolicy({
    agentId: "Slugger",
    mailboxAddress: "Slugger@OURO.bot",
    enabled: true,
    killSwitch: false,
    allowedRecipients: ["ARI@MENDELOW.ME"],
    allowedDomains: ["trusted.example"],
    maxRecipientsPerMessage: 3,
    rateLimit: { maxSends: 2, windowMs: 60_000 },
    actor,
    reason: "Ari approved low-risk autonomous native mail",
    updatedAt: "2026-04-23T00:00:00.000Z",
    ...overrides,
  })
}

function draft(overrides: Partial<MailOutboundRecord> = {}): MailOutboundRecord {
  return {
    schemaVersion: 1,
    id: "draft_1",
    agentId: "slugger",
    status: "draft",
    mailboxRole: "agent-native-mailbox",
    sendAuthority: "agent-native",
    ownerEmail: null,
    source: null,
    from: "slugger@ouro.bot",
    to: ["ari@mendelow.me"],
    cc: [],
    bcc: [],
    subject: "Low-risk check",
    text: "Can you confirm the plan?",
    actor: { kind: "agent", agentId: "slugger" },
    reason: "low-risk autonomous check",
    createdAt: "2026-04-23T00:01:00.000Z",
    updatedAt: "2026-04-23T00:01:00.000Z",
    ...overrides,
  }
}

describe("native mail autonomy policy", () => {
  it("normalizes policy fields and allows only explicitly low-risk native-agent drafts", () => {
    const decision = evaluateNativeMailSendPolicy({
      policy: policy(),
      draft: draft({ to: ["Ari <ARI@MENDELOW.ME>", "ops@trusted.example"] }),
      recentOutbound: [],
      now: new Date("2026-04-23T00:02:00.000Z"),
    })

    expect(decision).toEqual(expect.objectContaining({
      allowed: true,
      mode: "autonomous",
      code: "allowed",
      policyId: expect.stringMatching(/^mail_auto_/),
      evaluatedAt: "2026-04-23T00:02:00.000Z",
      remainingSendsInWindow: 1,
    }))
    expect(decision.recipients).toEqual(["ari@mendelow.me", "ops@trusted.example"])
  })

  it("requires confirmation for new or risky recipients without mutating the draft contract", () => {
    const decision = evaluateNativeMailSendPolicy({
      policy: policy(),
      draft: draft({ to: ["new.person@example.net"] }),
      recentOutbound: [],
      now: new Date("2026-04-23T00:02:00.000Z"),
    })

    expect(decision).toEqual(expect.objectContaining({
      allowed: false,
      mode: "confirmation-required",
      code: "recipient-not-allowed",
      fallback: "CONFIRM_SEND",
      reason: "new.person@example.net is not allowed for autonomous native-agent mail",
    }))
  })

  it("blocks autonomous sends for kill switch, recipient limits, rate limits, and delegated send-as-human attempts", () => {
    const base = policy()
    const recent = [
      draft({
        id: "draft_sent_1",
        status: "sent",
        sendMode: "autonomous",
        sentAt: "2026-04-23T00:01:30.000Z",
        updatedAt: "2026-04-23T00:01:30.000Z",
      }),
      draft({
        id: "draft_sent_2",
        status: "sent",
        sendMode: "autonomous",
        sentAt: "2026-04-23T00:01:45.000Z",
        updatedAt: "2026-04-23T00:01:45.000Z",
      }),
    ]

    expect(evaluateNativeMailSendPolicy({
      policy: { ...base, killSwitch: true },
      draft: draft(),
      recentOutbound: [],
      now: new Date("2026-04-23T00:02:00.000Z"),
    })).toEqual(expect.objectContaining({
      allowed: false,
      mode: "confirmation-required",
      code: "autonomy-kill-switch",
      fallback: "CONFIRM_SEND",
    }))

    expect(evaluateNativeMailSendPolicy({
      policy: { ...base, maxRecipientsPerMessage: 1 },
      draft: draft({ to: ["ari@mendelow.me", "ops@trusted.example"] }),
      recentOutbound: [],
      now: new Date("2026-04-23T00:02:00.000Z"),
    })).toEqual(expect.objectContaining({
      allowed: false,
      mode: "blocked",
      code: "recipient-limit-exceeded",
      fallback: "none",
    }))

    expect(evaluateNativeMailSendPolicy({
      policy: base,
      draft: draft(),
      recentOutbound: recent,
      now: new Date("2026-04-23T00:02:00.000Z"),
    })).toEqual(expect.objectContaining({
      allowed: false,
      mode: "blocked",
      code: "autonomous-rate-limit",
      fallback: "none",
    }))

    expect(evaluateNativeMailSendPolicy({
      policy: base,
      draft: draft({
        mailboxRole: "delegated-human-mailbox",
        sendAuthority: "delegated-human" as never,
        ownerEmail: "ari@mendelow.me",
        source: "hey",
        from: "ari@mendelow.me",
      }),
      recentOutbound: [],
      now: new Date("2026-04-23T00:02:00.000Z"),
    })).toEqual(expect.objectContaining({
      allowed: false,
      mode: "blocked",
      code: "delegated-send-as-human-not-authorized",
      fallback: "none",
    }))
  })
})

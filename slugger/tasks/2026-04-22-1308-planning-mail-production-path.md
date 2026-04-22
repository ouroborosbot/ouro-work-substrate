# Planning: Mail Production Path

**Status**: NEEDS_REVIEW
**Created**: 2026-04-22 13:09

## Goal
Make Ouro Work mail real end to end: native and delegated inbound mail should reach the hosted mail ingress through a production MX path, and outbound mail should use an authenticated sending path with clear provenance, audit, and human gates.

## Upstream Work Items
- None

**DO NOT include time estimates (hours/days) — planning should focus on scope and criteria, not duration.**

## Scope

### In Scope
- Choose and prove the production inbound mail edge for `ouro.bot` on SMTP port 25.
- Replace the broken current MX target with a chosen production MX target only after proof and explicit human approval.
- Preserve the existing trust model: hosted ingress may route, store, encrypt, and prove health, but must not read private mail.
- Keep native mail and delegated mail distinct in routing, provenance, placement, and audit.
- Define the outbound sending path as authenticated relay/API submission, not direct unauthenticated SMTP delivery from Azure.
- Add or update code, infra, tests, smoke scripts, and docs required for the chosen mail path.
- Record DNS, provider, and human-only gates in operations docs.

### Out of Scope
- Quietly changing registrar DNS, HEY forwarding, browser auth, MFA, or autonomous sending without the human at the keyboard.
- Hosting private mail-reading logic in the public service.
- Building a full webmail client.
- Replacing the Ouroboros harness mail sense, bounded tools, or vault ownership model.
- Treating discarded mail as reject/delete/bounce behavior.

## Completion Criteria
- [ ] Production inbound edge decision is explicit and documented with evidence.
- [ ] `ouro.bot` MX no longer points at a nonexistent host before production forwarding is declared ready.
- [ ] Native `slugger@ouro.bot` inbound mail reaches encrypted storage and lands in Screener.
- [ ] Delegated `me.mendelow.ari.slugger@ouro.bot` inbound mail reaches encrypted storage and carries owner/source provenance.
- [ ] Outbound path is designed around authenticated relay/API submission with SPF/DKIM/DMARC implications documented.
- [ ] Human-only DNS, HEY forwarding, and autonomous sending gates are documented and not bypassed by automation.
- [ ] Smoke tests prove health, recipient rejection, accepted mail storage, decryption through vault-held keys, and placement.
- [ ] 100% test coverage on all new code
- [ ] All tests pass
- [ ] No warnings

## Code Coverage Requirements
**MANDATORY: 100% coverage on all new code.**
- No `[ExcludeFromCodeCoverage]` or equivalent on new code
- All branches covered (if/else, switch, try/catch)
- All error paths tested
- Edge cases: null, empty, boundary values

## Open Questions
- [ ] Should the first approved implementation target inbound production receiving only, or include outbound send records and relay submission in the same task?
- [ ] Should the production inbound edge first prove Azure Container Apps on exposed port 25, or should we go straight to a dedicated `mx1.ouro.bot` mail edge with a stable public IP?
- [ ] Should outbound use Azure Communication Services Email for `ouro.bot`, a safer sending subdomain, or a different relay provider?
- [ ] Which human-owned DNS changes are acceptable in the first production cutover: MX only, or MX plus SPF/DKIM/DMARC alignment for sending?

## Decisions Made
- The current HEY bounce is expected: `ouro.bot` MX resolves to `ouro-bot.mail.protection.outlook.com`, and that hostname currently has no A/CNAME answer.
- The current Azure mail ingress is healthy and externally reachable on proof port `2525`; port `25` is not currently exposed.
- Direct outbound SMTP on port 25 is not the production sending strategy; use authenticated relay/API submission.
- The hosted service remains a router/encrypter/auditor, not the agent's private mail reader.
- Work-suite execution must happen on an agent-scoped branch with docs under `slugger/tasks/`.

## Context / References
- `AGENTS.md` trust invariants: private mail keys stay in the agent vault; unknown native inbound goes to Screener; delegated human mail carries owner/source provenance; DNS/MX and autonomous sending require explicit human action.
- `docs/architecture.md`: current one-sentence model and mail placement model.
- `docs/agent-account-lifecycle.md`: golden path for native mailbox and delegated source grants.
- `docs/deployment-story.md`: Phase 3/5 are still the open production ingress and mail edge decisions.
- `docs/operations.md`: smoke test expectations and human-only gates.
- `infra/azure/main.bicep`: current mail ingress exposes HTTP health plus an additional SMTP TCP port parameterized as `mailExposedSmtpPort`.
- `apps/mail-ingress/src/server.ts`, `apps/mail-ingress/src/store.ts`, and `packages/work-protocol/src/mail.ts`: current inbound parse, route, encrypt, placement, and screener behavior.
- Bounce evidence: `/Users/arimendelow/Downloads/attachment` reports `Status: 5.4.4` and `Host or domain name not found` for `ouro-bot.mail.protection.outlook.com`.
- Local DNS check: `dig MX ouro.bot` returns `0 ouro-bot.mail.protection.outlook.com.`; `dig A ouro-bot.mail.protection.outlook.com` returns no address.
- Azure check: `ouro-prod-mail-ingress.blueflower-44af4710.eastus2.azurecontainerapps.io:2525` accepts TCP; the same host on port `25` was not reachable with current config.
- Microsoft Learn: Azure Container Apps supports TCP ingress and additional TCP ports, with external TCP requiring a VNet-backed environment and exposed ports from 1-65535 except 80/443.
- Microsoft Learn: Azure recommends authenticated SMTP relay services, typically port 587, for reliable outbound sending; direct port 25 from Azure is restricted or unsupported for many platform/subscription shapes.
- Microsoft Learn: Azure Communication Services Email supports custom domains, SPF/DKIM sender authentication, SMTP auth through `smtp.azurecomm.net`, and configurable sender usernames when custom-domain limits allow.

## Notes
- Spark: Slugger should have mail that feels native and trustworthy, not a proof-port toy. A message to `slugger@ouro.bot` should arrive where the agent can sense it; a reply should be sent through a deliberate, authenticated channel with auditable provenance.
- Observed terrain: receiving worked in proof form on port `2525`; real MX delivery failed before touching our app because DNS points at a dead Outlook protection hostname. Sending has type-level placeholders for `draft` and `sent`, but no production sender service yet.
- Divergent pass: the boring shape is Container Apps on port 25 plus DNS cutover; the ambitious shape is a dedicated mail edge with static IP, TLS, queueing, and SMTP policy in front of encrypted storage; the weird-but-possibly-right shape is third-party inbound parse/webhook, rejected for now because it weakens the hosted-unreadability story.
- Tinfoil Hat changed the design: MX cannot include a custom port, so proof port `2525` proves the app but not real mail. DNS target stability matters as much as app health. Outbound is a separate submission problem, not "turn on SMTP" inside ingress.
- Stranger With Candy changed the vocabulary: `mail-ingress` is not an MTA unless it owns production SMTP behavior on port 25. `sent` records are not sending until a relay/provider confirms delivery or failure.
- Recommended thin slice: first make inbound production receiving true, including provider proof, DNS runbook, smoke test, and explicit human MX action. Then implement outbound relay submission as a separate approved slice using the selected provider/domain strategy.

## Progress Log
- 2026-04-22 13:09 Created

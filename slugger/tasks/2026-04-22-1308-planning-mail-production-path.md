# Planning: Mail Production Path

**Status**: NEEDS_REVIEW
**Created**: 2026-04-22 13:09

## Goal
Bring Agent Mail to full production shape across Ouro Work Substrate and the Ouroboros agent harness: hosted mailbox provisioning, native and delegated inbound mail over real MX, HEY-assisted delegation, authenticated outbound sending, agent-readable encrypted storage, recovery tooling, operations docs, deployment, and live smoke tests.

This is full-moon scope. It is not constrained to one PR, one repo, one turn, or an inbound-only slice.

## Upstream Work Items
- None

**DO NOT include time estimates (hours/days) — planning should focus on scope and criteria, not duration.**

## Scope

### In Scope
- Make changes in `ouro-work-substrate` and, when needed, `ouroboros-agent-harness`; keep each repo's planning/branch rules and PR discipline.
- Treat `ouro.bot` as the Ouro Work mail domain and intentionally move away from the current broken Microsoft 365-shaped MX/SPF setup after backup, proof, and explicit cutover approval.
- Make hosted Mail Control the production provisioning truth for `ouro account ensure` / `ouro connect mail`: public registry in Blob, newly generated private keys returned once, private keys stored immediately in the owning agent vault.
- Preserve local development setup as an explicit mode, but prevent local-only registry/key generation from being mistaken for production readiness.
- Keep shared protocol semantics synchronized across repos, especially mailbox records, source-grant aliases, key ids, placements, outbound statuses, and encryption/decryption behavior.
- Configure the local harness to read and update the hosted Azure Blob mail store through a least-privilege credential stored outside Git and preferably inside the agent vault.
- Prove native inbound `slugger@ouro.bot` over real SMTP port 25, with unknown native senders landing in Screener.
- Prove delegated HEY inbound `me.mendelow.ari.slugger@ouro.bot` over real SMTP port 25, with owner/source provenance and Imbox placement.
- Use the existing Azure Container Apps environment and static IP as the first production inbound candidate: expose SMTP on port 25, create `mx1.ouro.bot` as the MX host, and only fall back to a dedicated mail edge if Container Apps cannot pass the external port-25 proof.
- Add production SMTP behavior: STARTTLS with a valid certificate for the MX host, explicit max message size, clear transient/permanent SMTP response codes, connection/rate limits, recipient limits, protocol timeouts, and useful logs/metrics.
- Add Porkbun DNS automation and runbooks: credential setup, current-record backup, dry-run, apply, verification, rollback, and audit notes for A/MX/TXT/CNAME changes.
- Automate HEY forwarding setup where browser automation can safely do it, while treating login, MFA, CAPTCHA, and final HEY confirmation as human-at-keyboard gates.
- Make the forwarding target lifecycle explicit: `ouro account ensure` / `ouro connect mail` creates or repairs the delegated alias; the HEY onboarding step consumes that alias after hosted ingress and MX are proven.
- Add recovery handling for every brittle setup edge: missing Porkbun access, DNS propagation, port-25 exposure failure, Mail Control failure, vault locked/missing, one-time key loss, registry/key drift, HEY forwarding failure, missing forwarded mail, Blob access failure, decryption failure, wrong placement, outbound provider failure, and delivery events.
- Implement production outbound sending through authenticated provider submission, not direct unauthenticated SMTP from Azure. Azure Communication Services Email is the first candidate because it fits the existing Azure shape and supports SMTP auth, custom-domain sender authentication, and Event Grid delivery reports.
- Extend outbound records and UI/tooling so `draft`, `submitted`, provider-accepted/sent, delivered, bounced, quarantined/spam-filtered, failed, and event-reconciled states are not collapsed into a misleading `sent`.
- Keep `mail_send` confirmation-gated and family/self-only; autonomous sending remains disabled until a later explicit human enablement.
- Add ACS/domain-auth DNS automation and verification for SPF, DKIM, DKIM2 where required, and DMARC policy/reporting appropriate for a young production mail domain.
- Wire ACS/Event Grid delivery reports or an equivalent provider callback path into auditable outbound records.
- Update operations, deployment, account lifecycle, harness setup, troubleshooting, and golden-path validation docs so a future agent can recover without re-discovering the edges.
- Add targeted unit, integration, smoke, and deployment checks, with 100% coverage on all new code in the touched repos.

### Out of Scope
- Building a full read/write webmail client or destructive mail controls.
- Letting the hosted service read private mail bodies or retain private mail keys.
- Treating HEY forwarding as lossless or permanent; HEY itself warns that forwarding can miss spam-classified mail and can be affected by mail-authentication behavior.
- Sending as Ari or another human identity unless a separate explicit delegated-send design is approved. Full-moon outbound means Slugger can send confirmed mail from the agent mail identity first.
- Silently bypassing browser auth, MFA, registrar confirmation, or final production cutover approval. The agent may execute approved API/browser steps, but the human remains the authority at those gates.
- Preserving current Microsoft 365 mail behavior for `ouro.bot`; no required behavior has been identified there, and the current MX target is dead.
- Enabling autonomous sending.

## Completion Criteria
- [ ] `ouro account ensure` / `ouro connect mail` production mode calls hosted Mail Control, writes returned one-time private keys into the agent vault, configures the hosted Blob store reader, enables the Mail sense, and reports native plus delegated addresses without printing private keys.
- [ ] Re-running setup is idempotent: no duplicate registry records, no lost private keys, clear "already configured" output, and repair guidance when hosted registry, local registry, vault config, or Blob settings disagree.
- [ ] Key-loss recovery is explicit: the system detects missing vault-held private keys, does not silently regenerate incompatible keys, and offers a human-approved rotation/repair path with a warning that old encrypted mail needs the old key or vault backup.
- [ ] The harness and work-protocol models stay synchronized by dependency, generator, or contract tests; outbound statuses and source-grant alias semantics cannot drift silently between repos.
- [ ] Porkbun API access is set up outside Git, documented for future sessions, and verified with a read-only credential check before any DNS mutation.
- [ ] Existing `ouro.bot` DNS records are backed up before changes; DNS automation has dry-run, apply, verify, and rollback modes.
- [ ] `mx1.ouro.bot` resolves to the proven production inbound edge, and `ouro.bot` MX no longer points at `ouro-bot.mail.protection.outlook.com` before live mail is declared ready.
- [ ] Port 25 is externally reachable on the final MX target and real SMTP delivery succeeds without specifying a nonstandard port.
- [ ] STARTTLS is advertised with a valid certificate for the MX host; certificate installation and renewal are documented and tested.
- [ ] SMTP policy is tested for unknown recipient rejection, accepted recipient storage, message-too-large handling, parse/storage failures as transient where appropriate, recipient limits, rate limits, and logging without body leakage.
- [ ] Native live mail to `slugger@ouro.bot` reaches encrypted Azure Blob storage, decrypts through Slugger's vault-held key, appears in `mail_recent` / Ouro Outlook, and lands in Screener when the sender is unknown.
- [ ] Delegated live mail to `me.mendelow.ari.slugger@ouro.bot` reaches encrypted Azure Blob storage, decrypts through Slugger's vault-held key, carries `ownerEmail=ari@mendelow.me` and `source=hey`, and lands in Imbox.
- [ ] HEY forwarding onboarding can be run by the agent as far as browser automation safely permits, falls back to guided human steps for auth/MFA/blocked automation, records setup state, and verifies a forwarded HEY message end to end.
- [ ] Recovery docs and tooling cover partial failures at each step: DNS pending/wrong, port 25 down, Mail Control unavailable, vault locked, key mismatch, HEY forwarding unverified, forwarded mail missing, Blob credential failure, decryption failure, placement/provenance wrong, and provider send failure.
- [ ] Production outbound is configured through authenticated provider submission, with credentials stored outside Git and sender-domain authentication verified.
- [ ] Confirmed `mail_send` can send from the agent identity, records provider message ids, refuses unconfirmed/friend/autonomous sends, and keeps BCC/body privacy out of logs and unsafe summaries.
- [ ] Outbound delivery events or provider callbacks update auditable records so provider acceptance, delivery, bounce, suppression, quarantine/spam filtering, and failure are distinguishable.
- [ ] SPF, DKIM, DKIM2 where required, and DMARC records for the selected sender domain are documented, applied through the DNS workflow, and verified after propagation.
- [ ] Azure deployment, GitHub Actions, secrets/variables, and runbooks support the final inbound and outbound shape without local one-off production drift.
- [ ] Live smoke test proves: hosted health, Mail Control auth, mailbox/source ensure, SMTP port 25 accept/reject, encrypted Blob write, vault decryption, Screener/Imbox placement, HEY forwarded mail, confirmed outbound send, delivery event reconciliation, and Ouro Outlook audit.
- [ ] `npm run ci:local` passes in `ouro-work-substrate`.
- [ ] The relevant harness CI/test command passes in `ouroboros-agent-harness`.
- [ ] 100% test coverage on all new code.
- [ ] All tests pass.
- [ ] No warnings.

## Code Coverage Requirements
**MANDATORY: 100% coverage on all new code.**
- No `[ExcludeFromCodeCoverage]` or equivalent on new code
- All branches covered (if/else, switch, try/catch)
- All error paths tested
- Edge cases: null, empty, boundary values

## Open Questions
- [ ] No remaining scope questions after the 2026-04-22 full-moon feedback. Remaining gates are operational inputs and approval: Porkbun API access, any Azure/ACS credentials that cannot be created by the current session, HEY browser/MFA confirmation, and explicit plan/doing approval under the repo workflow.

## Decisions Made
- Scope is full-moon: inbound, outbound, DNS, HEY onboarding, hosted provisioning, local harness integration, recovery, docs, deployment, and live smoke tests all belong to this program.
- Work may span `ouro-work-substrate` and `ouroboros-agent-harness`; do not constrain implementation to the hosted repo if the local agent experience needs harness changes.
- `ouro.bot` is the intended Ouro Work mail domain.
- The current HEY bounce is expected: `ouro.bot` MX resolves to `ouro-bot.mail.protection.outlook.com`, and that hostname currently has no A/CNAME answer.
- The current Microsoft 365-shaped TXT/SPF records are not a constraint to preserve; back them up before changing them.
- Current Azure production evidence: Container Apps environment `ouro-prod-cae` has default domain `blueflower-44af4710.eastus2.azurecontainerapps.io` and static IP `20.10.114.197`.
- Current mail ingress evidence: `ouro-prod-mail-ingress.blueflower-44af4710.eastus2.azurecontainerapps.io` is deployed, HTTP target port is `8080`, and additional external TCP currently exposes only port `2525`.
- Proof port `2525` is reachable; port `25` is not currently exposed and must be proven before MX cutover.
- Primary inbound plan: expose mail ingress on port `25` in the existing VNet-backed Container Apps environment, point `mx1.ouro.bot` at the environment static IP, then set root MX to `mx1.ouro.bot` only after direct external SMTP proof. Fall back to a dedicated mail edge if this fails.
- STARTTLS should be included before production MX is declared ready. Plaintext SMTP may remain as opportunistic fallback for senders that do not upgrade, but the service should advertise STARTTLS with a valid MX-host certificate.
- Porkbun is the DNS provider. Use Porkbun API access for agent-runnable DNS backup/dry-run/apply/rollback once credentials are safely provisioned.
- `ouro account ensure` / `ouro connect mail` creates the delegated forwarding target alias. HEY setup should not create the alias; it should configure HEY to forward to the already verified source-grant alias.
- Browser automation for HEY is desirable, but auth/MFA/CAPTCHA and final confirmation are human-at-keyboard gates. The automation must be resumable and able to fall back to exact guided steps.
- Direct outbound SMTP from Azure is not the production sending strategy. Use authenticated provider submission, with ACS Email as the first candidate.
- Provider acceptance is not final delivery. Outbound records must model submission, provider acceptance, delivery, bounce/suppression/quarantine/spam filtering, and failure separately.
- Autonomous sending remains disabled.
- Current harness setup can create local Mailroom registry/key state without calling hosted Mail Control. Production setup must close this gap or production ingress can encrypt to public keys the local agent does not have.
- Current harness reader already has an Azure Blob store shape, but production setup must configure the actual hosted Blob coordinates and least-privilege credential path.
- Current outbound records store `text` directly in outbound JSON; production outbound needs a privacy review before writing sent bodies to Blob-backed stores.
- Mail private keys remain in the owning agent vault, not Blob Storage, GitHub, Container Apps, logs, or scratch docs.

## Context / References
- `AGENTS.md`: trust invariants, repo boundary, human-only gates, and task workflow.
- `README.md`: hosted repo boundary and production state.
- `docs/architecture.md`: Mail Control writes the public registry and returns new private keys exactly once; only the local agent with vault-held keys reads private mail.
- `docs/agent-account-lifecycle.md`: desired ensure flow and recovery posture.
- `docs/deployment-story.md`: Phase 3/5 are still the open production ingress and mail edge decisions.
- `docs/operations.md`: smoke tests, deploy path, rollback, and human-only gates.
- `infra/azure/main.bicep`: mail ingress already supports parameterized SMTP target/exposed ports through Container Apps additional TCP port mappings.
- `apps/mail-control/src/server.ts`: production ensure endpoint is `POST /v1/mailboxes/ensure`; returns `mailboxAddress`, `sourceAlias`, generated private keys, and registry revision.
- `apps/mail-ingress/src/server.ts`: current SMTP server disables `AUTH` and `STARTTLS`; production TLS posture is a required code change.
- `packages/work-protocol/src/mail.ts`: current outbound status is only `draft | sent | failed`; full-moon outbound requires a richer model.
- `/Users/arimendelow/Projects/ouroboros-agent-harness/docs/agent-mail-setup.md`: harness-side Agent Mail setup, HEY forwarding, golden path, and troubleshooting.
- `/Users/arimendelow/Projects/ouroboros-agent-harness/docs/hosted-work-substrate.md`: hosted/local repo boundary.
- `/Users/arimendelow/Projects/ouroboros-agent-harness/src/heart/daemon/cli-exec.ts`: current `ensureAgentMailroom` / `executeConnectMail` path creates local registry/key state and stores keys in vault `runtime/config`.
- `/Users/arimendelow/Projects/ouroboros-agent-harness/src/mailroom/reader.ts`: harness can resolve an Azure Blob Mailroom store from runtime config, but setup must provide production coordinates and credentials.
- `/Users/arimendelow/Projects/ouroboros-agent-harness/src/mailroom/outbound.ts`: ACS outbound transport is recognized but currently throws "configured but not enabled".
- `/Users/arimendelow/Projects/ouroboros-agent-harness/src/repertoire/tools-mail.ts`: bounded mail tools, Screener behavior, draft/send confirmation gates.
- Bounce evidence: `/Users/arimendelow/Downloads/attachment` reports `Status: 5.4.4` and "Host or domain name not found" for `ouro-bot.mail.protection.outlook.com`.
- Local DNS evidence on 2026-04-22: `dig MX ouro.bot` returns `0 ouro-bot.mail.protection.outlook.com.`; `dig A`/`CNAME` for that target return no address; TXT includes Microsoft verification, Google verification, and `v=spf1 include:spf.protection.outlook.com -all`.
- Azure live evidence on 2026-04-22: `ouro-prod-cae` static IP is `20.10.114.197`; `ouro-prod-mail-ingress` exposes TCP `2525` only.
- Porkbun API docs: https://porkbun.com/api/json/v3/documentation and https://porkbun.com/api/json/v3/spec. The API supports credential checks, DNS management, API-key request/retrieve flow, rate-limit metadata, and SSL bundle retrieval.
- Azure Container Apps ingress docs: https://learn.microsoft.com/en-us/azure/container-apps/ingress-overview and https://learn.microsoft.com/en-us/azure/container-apps/ingress-how-to. External TCP ingress and additional TCP ports are supported in VNet-backed environments; exposed TCP ports can be configured from 1 to 65535 except 80/443.
- HEY forwarding docs: https://www.hey.com/forwarding/. HEY says forwarding should not be the sole critical-mail path, spam-classified mail is not forwarded, and forwarding can break authentication despite ARC support.
- ACS SMTP auth docs: https://learn.microsoft.com/en-us/azure/communication-services/quickstarts/email/send-email-smtp/smtp-authentication. ACS SMTP uses `smtp.azurecomm.net`, TLS/StartTLS, port 587 recommended, and Microsoft Entra app credentials.
- ACS sender-auth docs: https://learn.microsoft.com/en-us/azure/communication-services/concepts/email/email-domain-and-sender-authentication. Custom domains require ownership verification and sender authentication support.
- ACS email events docs: https://learn.microsoft.com/en-us/azure/event-grid/communication-services-email-events. Delivery events include delivered, bounced, suppressed, quarantined, spam-filtered, and failed states.

## Notes
- Spark: Slugger should have mail that feels native and trustworthy, not a proof-port toy. A message to `slugger@ouro.bot` should arrive where the agent can sense it; delegated HEY mail should be clearly labeled as Ari's granted source; a reply should leave through a deliberate, authenticated, auditable channel.
- Observed terrain: receiving worked in proof form on port `2525`; real MX delivery failed before touching our app because DNS points at a dead Outlook protection hostname. Sending has local-sink proof and ACS placeholders, but no production sender service yet.
- Divergent pass: the boring version is Container Apps port 25 plus Porkbun DNS; the ambitious version is a dedicated mail edge with queueing and SMTP policy in front of encrypted Blob storage; the weird-but-possibly-right version is third-party inbound parse/webhooks, rejected because it weakens hosted unreadability. The surviving first candidate is Container Apps because the existing environment is VNet-backed, has a static IP, and already proves the app path.
- Tinfoil Hat changed the design: MX cannot include port `2525`, so proof-port success is not production mail. Hosted Mail Control must be the provisioning truth or hosted ingress may encrypt to keys the local agent does not have. Blob data-plane access from the harness is also part of production, not a later nicety.
- Tinfoil Hat second pass: STARTTLS, DNS rollback, certificate renewal, storage transient failures, rate limits, and decryption/key-mismatch recovery are not hardening extras; they are what make "mail works" recoverable.
- Stranger With Candy changed the vocabulary: `sent` is currently too optimistic, local-only Mailroom setup is not production account ensure, HEY forwarding to the native address would prove delivery while losing delegated provenance, and "DNS automation" must include backup/dry-run/rollback rather than just update calls.
- Recovery model: every setup step should be idempotent and report one of `not_started`, `blocked_by_human`, `pending_propagation`, `ready`, `failed_recoverable`, or `failed_manual_repair`, with the next agent-runnable command and the human-required action separated.
- Recommended execution shape after approval: multiple narrow PRs under this full-moon plan, roughly contract/protocol sync, hosted provisioning integration, inbound edge/TLS/DNS automation, harness hosted reader and setup recovery, HEY onboarding automation, outbound provider/events, docs/smoke/deploy. The doing doc should define exact units before execution.

## Progress Log
- 2026-04-22 13:09 Created
- 2026-04-22 13:10 Added scrutiny findings for TLS, abuse controls, outbound status, DNS ownership, and delegated HEY forwarding

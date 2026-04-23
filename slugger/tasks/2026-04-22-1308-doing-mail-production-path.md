# Doing: Mail Production Path

**Status**: in-progress
**Execution Mode**: direct
**Created**: 2026-04-22 14:33
**Planning**: ./2026-04-22-1308-planning-mail-production-path.md
**Artifacts**: ./2026-04-22-1308-doing-mail-production-path/

## Execution Mode

- **pending**: Awaiting user approval before each unit starts (interactive)
- **spawn**: Spawn sub-agent for each unit (parallel/autonomous)
- **direct**: Execute units sequentially in current session (default)

## Objective
Bring Agent Mail to full production shape across Ouro Work Substrate and the Ouroboros harness while keeping native agent correspondence and delegated human mailbox access visibly separate. Agent-native mail must support real autonomous receive and policy-governed autonomous send as `slugger@ouro.bot`; delegated HEY mail must provide full executive-assistant access to Ari's mailbox through export backfill and future forwarding without becoming Slugger's own correspondence or send-as-human authority.

## Upstream Work Items
- None

## Completion Criteria
- [ ] Production setup calls hosted Mail Control, stores one-time private keys in the owning agent vault, configures hosted Blob reader coordinates, enables Mail sense, and reports native plus delegated addresses without printing secrets.
- [ ] Setup and repair are idempotent across hosted registry, local registry, vault config, source grants, keys, and Blob settings.
- [ ] Native agent mail and delegated human mailbox source stay separate in protocol records, storage compartments, access tools, Outlook, audit, policy, recovery, and prompt/sense context.
- [x] The harness vault surface is corrected before DNS/mail implementation: generic human-facing vault item commands exist, notes are first-class, `ouro connect` remains harness-managed only, and templates/compatibility aliases never create new credential species.
- [x] The harness vault-item branch is merged, published through the harness npm release lane, and installed locally before DNS/mail workflow code depends on the new surface.
- [ ] DNS/mail production workflows consume explicit non-secret bindings that reference generic vault item paths; no code or docs treat the referenced item as an ops credential, authority, Porkbun credential, DNS credential, or provider-shaped ontology.
- [x] Shared mail protocol semantics are protected by a consumed `@ouro/work-protocol` package boundary or generated/schema contract tests so harness and substrate cannot drift silently.
- [ ] Production MX points to a proven port-25 edge with STARTTLS, size limits, transient/permanent failures, rate limits, recipient limits, and body-safe observability.
- [ ] Native live mail to `slugger@ouro.bot` reaches encrypted Blob storage, decrypts through Slugger's vault key, enters the right Imbox/Screener state, and behaves as a body-safe sense.
- [ ] Ari's delegated HEY source is backfilled from MBOX with provenance/freshness and receives all future forwarded mail at `me.mendelow.ari.slugger@ouro.bot` with owner/source labels everywhere.
- [ ] HEY forwarding onboarding is resumable, browser/MFA-aware, source-scoped, and recoverable when forwarding is missing, stale, or lossy.
- [ ] Production outbound uses authenticated provider submission, records provider ids/events, and distinguishes submitted, accepted, delivered, bounced, suppressed, quarantined/spam-filtered, and failed outcomes.
- [ ] Policy-governed autonomous native-agent sending is implemented with default confirmation for risky/new sends, explicit allow policy for autonomous low-risk sends, rate/recipient limits, audit, and kill switch.
- [ ] Delegated human mail never grants send-as-human authority by default; follow-ups based on Ari's HEY mail send from the agent identity unless a future delegated-send product is approved.
- [ ] SPF, DKIM/DKIM2 where required, and DMARC records are applied and verified for the chosen sender domain.
- [ ] Recovery docs/tooling cover DNS, port 25, Mail Control, vault/key drift, HEY forwarding, Blob access, decryption, wrong placement/provenance, outbound provider failures, and delivery events.
- [ ] Hosted substrate packaging/deployment is documented and verified as private commit-addressed Docker images plus Bicep/GitHub Actions deploy, not an npm package for deployable services.
- [x] Branch protections for `ouro-work-substrate` and `ouroboros` require the intended green checks, enforce admins, require linear history, and require conversation resolution.
- [ ] Live smoke proves hosted health, mailbox/source ensure, SMTP accept/reject, encryption/decryption, native Screener/Imbox, delegated HEY backfill and forward, autonomous native send policy, provider event reconciliation, and Ouro Outlook audit.
- [ ] `npm run ci:local` passes in `ouro-work-substrate`.
- [ ] Relevant harness tests, `npx tsc --noEmit`, and release preflight pass in `/Users/arimendelow/Projects/ouroboros-agent-harness` or its task worktree.
- [ ] 100% test coverage on all new code.
- [ ] All tests pass.
- [ ] No warnings.

## Code Coverage Requirements
**MANDATORY: 100% coverage on all new code.**
- No `[ExcludeFromCodeCoverage]` or equivalent on new code
- All branches covered (if/else, switch, try/catch)
- All error paths tested
- Edge cases: null, empty, boundary values

## TDD Requirements
**Strict TDD — no exceptions:**
1. **Tests first**: Write failing tests BEFORE any implementation
2. **Verify failure**: Run tests, confirm they FAIL (red)
3. **Minimal implementation**: Write just enough code to pass
4. **Verify pass**: Run tests, confirm they PASS (green)
5. **Refactor**: Clean up, keep tests green
6. **No skipping**: Never write implementation without failing test first

## Work Units

Legend: ⬜ Not started · 🔄 In progress · ✅ Done · ❌ Blocked

**CRITICAL: Every unit header MUST start with status emoji (⬜ for new units).**

### ✅ Unit 0: Workspace And Foundation Baseline
**What**: Prepare dedicated worktrees/branches for work-substrate and harness, record current dirty-state boundaries, reread foundation task docs, and capture the live baseline for DNS, Azure, GitHub, harness Mail sense, Slugger vault readiness, and deployed services.
**Output**: Baseline artifact with repo/worktree paths, current commits, live DNS/Azure facts, foundation-doc summary, and immediate blockers.
**Acceptance**: Baseline proves no user changes were overwritten, names the active remotes/branches, and confirms which human inputs are genuinely missing before implementation begins.

### ✅ Unit 0a: Harness Vault Item Surface — Tests
**What**: Write failing harness tests and doc contracts for a generic human-facing vault item/credential surface: stable item name/path, hidden secret entry, optional public fields, freeform editable notes, tags/folder-ish organization, timestamps/provenance, list/status without secret exposure, reserved runtime/config guidance, templates as convenience only, and provider helper compatibility.
**Output**: Red CLI/docs tests in the harness worktree, including docs contracts for `README.md`, `AGENTS.md`, `docs/auth-and-providers.md`, and `ouro help vault`.
**Acceptance**: Tests fail where the only human CLI path for an arbitrary credential is provider-specific, where docs/help show template or compatibility helpers before the generic item surface, or where docs imply ops credentials, authorities, DNS credentials, or provider credentials are separate ontologies for freeform vault items.

### ✅ Unit 0b: Harness Vault Item Surface — Implementation
**What**: Implement or expose generic `ouro vault item` or `ouro vault credential` commands over the existing agent-vault item primitive, with clear item naming, notes, hidden secret prompts, metadata-only status/list, and guardrails around reserved harness-managed items. Templates such as `--template porkbun-api` only shape prompts/fields. Keep `vault ops porkbun` as a deprecated compatibility alias that stores an ordinary vault item and points users toward the generic model.
**Output**: Harness CLI/code/docs changes, compatibility behavior, and task notes. `docs/auth-and-providers.md` must replace the misleading `Operational Credentials` framing with `Vault Items, Managed Workflows, And Bindings` or equivalent wording.
**Acceptance**: A human can store/check a non-runtime credential for Slugger without a provider-specific command; the existing Porkbun-related item remains usable as a normal vault item that a DNS workflow binding may reference.

### ✅ Unit 0c: Harness Vault Item Surface — Coverage And Release
**What**: Cover error paths, noninteractive failures, reserved item collisions, no-secret logging, notes handling, and command-help ergonomics; run harness tests, full coverage, TypeScript, and release preflight so the branch is ready for PR/release.
**Output**: Coverage artifacts, release-preflight evidence, and harness branch evidence.
**Acceptance**: 100% coverage on new vault-surface code and future agents see "vault item / credential with no assumed use" first in help/docs before templates or compatibility aliases. Docs/tests explicitly say notes are for human/agent orientation and are never machine contracts.

### ✅ Unit 0d: Full-Moon Work-Suite Refresh
**What**: Rerun the post-vault-correction full-moon thinking pass and update the plan around packaging/deployment lanes, shared protocol drift, branch protections, and the exact production-ready bar.
**Output**: `full-moon-work-suite-refresh.md` plus refreshed planning/doing docs.
**Acceptance**: The task docs make clear that harness npm release/install, hosted Azure deploy, shared protocol package/contract gates, branch protection, and live smoke are part of "done"; no unresolved human product questions remain.

### ✅ Unit 0e: Harness Vault Item Surface — Merge, Publish, Install
**What**: Create the harness PR for `slugger/vault-item-surface`, wait for CI, merge to `main`, publish/install the resulting harness alpha release, and verify the installed `ouro` exposes the generic vault item surface plus deprecated Porkbun compatibility alias.
**Output**: PR URL, CI/merge/release/install evidence, installed CLI verification logs.
**Acceptance**: The local agent runtime can rely on `ouro vault item` in the installed harness; `vault ops porkbun` still works as a deprecated alias over an ordinary item; DNS/mail workflow work is no longer blocked on unreleased harness surface changes.

### ✅ Unit 1a: Two-Lane Mail Contract — Tests
**What**: Write failing tests/contract checks that native agent mail and delegated human mailbox source cannot collapse across protocol, harness types, tools, Outlook labels, prompt/sense summaries, and recovery records.
**Output**: Red tests in work-substrate and/or harness for compartment/source labels, source-scoped policy, delegated reads, native autonomous send policy, and no delegated send-as-human path.
**Acceptance**: Tests fail against the current production branch where the distinction is incomplete or not enforced end to end.

### ✅ Unit 1b: Two-Lane Mail Contract — Implementation
**What**: Update shared protocol, harness mailroom types, docs, prompts, Outlook reader/UI, and tool responses so every mail object is clearly native-agent or delegated-human-source with stable owner/source provenance.
**Output**: Contract/code/docs changes in the appropriate repo PRs.
**Acceptance**: Red tests pass; no user-facing surface can present Ari's HEY mail as Slugger's own correspondence.

### ✅ Unit 1c: Two-Lane Mail Contract — Coverage And Refactor
**What**: Fill branch/error coverage, remove duplicate vocabulary, and verify cross-repo contract drift is caught by tests or generated/shared types.
**Output**: Coverage artifacts and cleanup commits.
**Acceptance**: 100% coverage on new/changed contract code and focused tests green in both repos.

### ⬜ Unit 2a: Hosted Provisioning Truth — Tests
**What**: Write failing tests for production `ouro account ensure` / `ouro connect mail` calling hosted Mail Control, storing returned keys in vault, configuring Blob reader coordinates, preserving existing keys, and detecting hosted/local/vault drift.
**Output**: Red harness and hosted control-plane tests.
**Acceptance**: Tests fail where setup can still be local-only or drift is not recoverable.

### ⬜ Unit 2b: Hosted Provisioning Truth — Implementation
**What**: Implement production-mode setup/repair that uses hosted Mail Control as registry truth, stores keys and Blob coordinates in `runtime/config`, keeps local mode explicit, and gives actor-labeled recovery guidance.
**Output**: Harness setup code, hosted API/client code if needed, docs, and tests.
**Acceptance**: Repeated setup is boring/idempotent; private keys are not printed or hosted; Slugger can read hosted Blob mail through vault-held keys.

### ⬜ Unit 2c: Hosted Provisioning Truth — Coverage And Refactor
**What**: Cover locked vault, missing token, Mail Control outage, one-time key loss, malformed registry, stale local registry, and Blob credential failures.
**Output**: Coverage pass and repair-path documentation.
**Acceptance**: Error paths are tested and recovery copy names agent-runnable versus human-required work.

### ⬜ Unit 3a: DNS And Certificate Automation — Tests
**What**: Write failing tests for DNS workflow binding resolution: domain, driver, explicit vault item path, resource allowlist, no note parsing, Porkbun read-only ping/retrieve as the current `ouro.bot` driver, DNS backup, dry-run diff, apply, verify, rollback, and ACME/certificate material handling without logging secrets.
**Output**: Red tests and fixture DNS records.
**Acceptance**: Tests fail until automation can prove safe DNS mutation behavior without treating the referenced vault item as a DNS credential, ops credential, authority, or provider-shaped credential.

### ⬜ Unit 3b: DNS And Certificate Automation — Implementation
**What**: Implement DNS automation and certificate flow for `mx1.ouro.bot` as a workflow binding plus provider driver. The binding names `domain`, `driver`, `credentialItem`, and resource allowlist. The driver reads only the required secret fields from the referenced vault item. Store no raw secrets outside approved secret paths, do not parse notes, and preserve unrelated verification records.
**Output**: Scripts/CLI/workflow, binding docs, driver docs, and secret hygiene checks.
**Acceptance**: With the configured workflow binding, automation can retrieve current records and produce a safe dry-run; apply/rollback are available for cutover.

### ⬜ Unit 3c: DNS And Certificate Automation — Coverage And Refactor
**What**: Verify no secrets in logs/process artifacts, cover vault item lookup failures, missing required secret fields, provider API failures, rate limits, propagation pending, and document future-session access using the generic vault-item plus workflow-binding model.
**Output**: Coverage artifacts and operations docs.
**Acceptance**: 100% coverage on new DNS/cert automation and a successful read-only workflow-binding check for the current `ouro.bot` binding.

### ⬜ Unit 4a: Production SMTP Edge — Tests
**What**: Write failing tests for STARTTLS advertisement/certificate config, max size, recipient limits, connection/rate limits, transient storage failures, unknown recipient rejection, and body-safe logs.
**Output**: Red mail-ingress tests and infra expectations.
**Acceptance**: Tests fail against current STARTTLS-disabled, proof-port-only behavior.

### ⬜ Unit 4b: Production SMTP Edge — Implementation
**What**: Harden mail ingress and infra for production SMTP on port 25, first trying existing Container Apps static-IP shape and falling back to a dedicated mail edge if port 25 still cannot be proven.
**Output**: App/infra changes, deployment workflow updates, docs, and proof artifacts.
**Acceptance**: Final edge accepts real SMTP on port 25, advertises STARTTLS, stores encrypted mail, and rejects unknown recipients without becoming a relay.

### ⬜ Unit 4c: Production SMTP Edge — Coverage And Refactor
**What**: Run local and deployed SMTP policy tests, inspect logs for body leakage, and document rollback/diagnostics.
**Output**: Test logs and operations updates.
**Acceptance**: Port-25 proof is reproducible or a fallback edge is live and proven.

### ⬜ Unit 5a: Delegated HEY Source — Tests
**What**: Write failing tests for HEY MBOX backfill freshness/provenance, no import wake storm, future-forwarded source placement, source-scoped Screener decisions, source revocation, and forwarding setup state.
**Output**: Red harness/work-substrate tests and HEY fixture cases.
**Acceptance**: Tests fail where historical import and live delegated forwarding are not clearly separated.

### ⬜ Unit 5b: Delegated HEY Source — Implementation
**What**: Complete backfill/import and forwarding setup/recovery flow for Ari's HEY mailbox, including browser-automation hooks where available and guided fallback for login/MFA/export/forwarding.
**Output**: Harness setup/onboarding changes, source-state records, docs, and verification tooling.
**Acceptance**: Ari's imported and future-forwarded HEY mail are searchable/readable with bounded audited tools and always labeled as delegated source mail.

### ⬜ Unit 5c: Delegated HEY Source — Coverage And Refactor
**What**: Cover missing MBOX, duplicate imports, forwarding not configured, source revoked while mail still forwards, wrong alias, and source-scoped allow/discard conflicts.
**Output**: Coverage artifacts and recovery runbook.
**Acceptance**: 100% coverage on new delegated-source code and successful local proof.

### ⬜ Unit 6a: Native Agent Mail Autonomy — Tests
**What**: Write failing tests for native mail sense receive behavior, Screener attention, known sender Imbox, autonomous send policy, confirmation fallback, rate/recipient limits, kill switch, and no autonomous sends to risky/new recipients.
**Output**: Red harness tests and hosted protocol tests where needed.
**Acceptance**: Tests fail until native autonomous sending is policy-governed and auditable.

### ⬜ Unit 6b: Native Agent Mail Autonomy — Implementation
**What**: Implement production native send/receive behavior: compact sense state, cross-sense attention, authenticated outbound submission, policy-governed autonomous sends, confirmation fallback, and kill switch.
**Output**: Harness tools/sense/outbound code, provider config, hosted event endpoints if needed, docs.
**Acceptance**: Slugger can receive native mail and send as `slugger@ouro.bot` within explicit native-agent policy while refusing out-of-policy sends.

### ⬜ Unit 6c: Native Agent Mail Autonomy — Coverage And Refactor
**What**: Cover provider failures, bounce/delivery events, policy revocation, trust downgrade, mail loops, and audit visibility.
**Output**: Coverage artifacts and autonomy policy docs.
**Acceptance**: 100% coverage on new autonomy code and no unsafe send path remains untested.

### ⬜ Unit 7a: Outbound Provider And Events — Tests
**What**: Write failing tests for ACS or selected provider submission, credential resolution, provider message ids, Event Grid/webhook delivery events, bounce/suppression/quarantine/spam-filtered states, and idempotent event reconciliation.
**Output**: Red provider adapter and hosted event tests.
**Acceptance**: Tests fail until provider acceptance and final delivery outcomes are separated.

### ⬜ Unit 7b: Outbound Provider And Events — Implementation
**What**: Implement authenticated outbound provider submission, domain-auth DNS records, event endpoint/subscription, event reconciliation, and audited sent-copy storage.
**Output**: Provider adapter, hosted callback/event code, DNS records, docs, and deploy changes.
**Acceptance**: Confirmed and autonomous native sends produce provider ids and later delivery/bounce/event updates.

### ⬜ Unit 7c: Outbound Provider And Events — Coverage And Refactor
**What**: Cover credential failure, provider retry, duplicate events, unknown provider messages, and body-safe event logs.
**Output**: Coverage artifacts and operations docs.
**Acceptance**: 100% coverage on new provider/event code and live provider smoke passes.

### ⬜ Unit 8a: Outlook, Tools, And Audit Ergonomics — Tests
**What**: Write failing tests/screenshots for clear native versus delegated labeling, source folders, access logs, autonomous send audit, delivery events, recovery drawers, and no body leakage in summaries.
**Output**: Red API/UI/tool tests.
**Acceptance**: Tests fail until the mailbox surface shows executive-assistant clarity instead of a blended inbox.

### ⬜ Unit 8b: Outlook, Tools, And Audit Ergonomics — Implementation
**What**: Polish Outlook, mail tools, access logs, and prompt/sense summaries around the two-lane model and production delivery states.
**Output**: Harness UI/API/tooling/docs changes.
**Acceptance**: The agent and human can always tell whether a message is Slugger's mail or Ari's delegated HEY mail, why it surfaced, and what actions occurred.

### ⬜ Unit 8c: Outlook, Tools, And Audit Ergonomics — Coverage And Refactor
**What**: Run UI tests/build/screenshot checks, focused mail tool tests, and accessibility/responsive checks.
**Output**: Screenshot artifacts and green UI/API tests.
**Acceptance**: No overlapping/blank UI states and 100% coverage on new reader/tool code.

### ⬜ Unit 9: Recovery, Operations, And Docs
**What**: Update operations/account lifecycle/harness setup docs and implement any doctor/status checks needed for DNS, MX, HEY source, hosted registry/vault key drift, Blob access, delivery events, and autonomy kill switch.
**Output**: Runbooks, contract tests, and recovery tooling.
**Acceptance**: A future agent can recover each documented failure mode without rediscovering the system.

### ⬜ Unit 10: Deploy, Cutover, And Live Smoke
**What**: Deploy after green CI, run DNS dry-run and apply after proof, verify MX/STARTTLS, run native inbound/outbound/autonomy tests, run HEY backfill/forwarding tests, inspect Outlook/audit, and merge/release/install as repo workflows require.
**Output**: Deployment logs, DNS backup/diff, live smoke artifacts, PR/CI/merge/release evidence, and final installed-state verification.
**Acceptance**: Full production completion criteria are met; remaining issues are either fixed or documented as explicit follow-up work with owner/removal criteria.

## Execution
- Work in dedicated worktrees and branches for every repo touched.
- Human approval gates for planning/doing/process are waived for this task; proceed directly unless a genuine external input is required.
- Stop only for genuine human inputs: missing secret material through hidden prompt or approved secret store, Slugger vault unlock/secret entry, HEY browser/MFA/export/forwarding, provider verification that cannot be automated, and live mail sent from human-controlled accounts.
- Treat packaging/deployment as separate release lanes: harness CLI/runtime changes must be merged, npm-published, and installed; hosted substrate services must be merged, deployed through GitHub Actions/Bicep as commit-tagged images, and live-smoked; shared protocol semantics need a package or contract gate.
- **TDD strictly enforced**: tests → red → implement → green → refactor
- Commit after each phase or logical unit.
- Push after each unit complete.
- Run focused tests before marking unit done and full repo validation before merge/deploy.
- **All artifacts**: Save outputs, logs, data to `./2026-04-22-1308-doing-mail-production-path/`.
- **Decisions made**: Update docs immediately, commit right away.

## Progress Log
- 2026-04-22 14:33 Created from planning doc after human waived process gates and foundation mail docs were reread.
- 2026-04-22 14:34 Fixed unit heading format after template check.
- 2026-04-22 14:36 Started Unit 0 baseline and worktree setup.
- 2026-04-22 17:25 Captured post-compaction credential-orientation correction: generic vault item first, workflow binding second, provider template last.
- 2026-04-22 17:36 Promoted the generic harness vault item surface from documentation debt into first-order Units 0a-0c before DNS/mail implementation.
- 2026-04-22 17:45 Rewrote credential orientation to the stricter primitive: vault item/credential with no assumed use; workflows bind to items outside the item; notes are never machine contracts.
- 2026-04-22 17:51 Mapped the documentation and surface fix: harness origin currently teaches `Operational Credentials` plus `vault ops porkbun`; implementation must make `ouro vault item` canonical and reduce provider helpers to templates or deprecated compatibility aliases.
- 2026-04-22 17:56 Unit 0 complete: captured clean substrate and harness worktrees, live DNS/Azure/GitHub/vault facts, foundation mail carry-forward, and genuine remaining human gates in `unit0-baseline.md`.
- 2026-04-22 18:04 Unit 0a complete: added and pushed red harness tests for generic vault item docs, help, parsing, execution, compatibility alias behavior, and agent-facing credential tool vocabulary. Evidence lives in `unit0a-red-tests.md`.
- 2026-04-22 18:12 Unit 0b complete: implemented and pushed the generic harness vault item surface, documentation ladder, agent-tool vocabulary, and Porkbun deprecated compatibility alias. Evidence lives in `unit0b-implementation.md`.
- 2026-04-22 18:49 Unit 0c complete: pushed harness commit `4dec8d50c9f5c05986352fb48616b9ceb229e563` with 100% full coverage, nerves audit pass, release preflight pass after alpha.466 version/changelog bump, and guardrail coverage for reserved/freeform vault item behavior. Evidence lives in `unit0c-coverage-release.md`.
- 2026-04-22 18:49 Human explicitly flagged that the full-moon mail plan needs a fresh work-suite pass after the vault ontology correction and that packaging/deployment must be first-class scope, not an afterthought.
- 2026-04-22 18:52 Unit 0d complete: ran a fresh work-suite refresh and recorded the three release lanes, shared protocol drift risk, branch protection facts, and next thin slice in `full-moon-work-suite-refresh.md`.
- 2026-04-22 19:13 Unit 0e complete: merged harness PR #587, watched green main publish job, verified npm/latest at `0.1.0-alpha.466`, updated local `ouro` to alpha.466, and verified installed generic vault item status/list plus deprecated Porkbun compatibility alias. Evidence lives in `unit0e-merge-publish-install.md`.
- 2026-04-22 19:18 Unit 1a complete: added red tests in substrate and harness for shared mailbox provenance, access-log provenance, attention summaries, outbound native-send authority, and owner-scoped Outlook delegated source folders. Evidence lives in `unit1a-red-tests.md`.
- 2026-04-22 19:37 Unit 1b complete: implemented shared/harness two-lane provenance descriptors, access-log and attention provenance, native outbound authority fields, Outlook owner-scoped source folders, legacy fallbacks, and 100% coverage. Evidence lives in `unit1b-implementation.md`.
- 2026-04-22 19:48 Unit 1c complete: added canonical substrate mail provenance contract JSON, harness vendored contract drift tests, docs for the private-package contract lane, and 100% coverage evidence. Evidence lives in `unit1c-coverage-contract.md`.

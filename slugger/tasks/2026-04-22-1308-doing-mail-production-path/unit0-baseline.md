# Unit 0 Baseline: Mail Production Path

Captured: 2026-04-22 14:45 America/Los_Angeles

## Execution Worktrees

- Work substrate: `/Users/arimendelow/Projects/_worktrees/slugger-mail-production-substrate`
  - Branch: `slugger/mail-production-full-moon`
  - Commit: `026c66601e85d046dcd6c1579c511f8131b5550a`
  - Remote: `origin git@github.com:ouroborosbot/ouro-work-substrate.git`
  - Status: clean at baseline
- Harness: `/Users/arimendelow/Projects/_worktrees/slugger-mail-production-harness`
  - Branch: `slugger/mail-production-full-moon`
  - Commit: `822bfacdec795029845aa5f0b068d838f2381719`
  - Remotes:
    - `origin https://github.com/ouroborosbot/ouroboros`
    - `fork https://github.com/tmcarmichael/ouroboros`
  - Status: clean at baseline
- Shared checkouts were left alone:
  - `/Users/arimendelow/Projects/ouro-work-substrate`: `slugger/mail-production-shape`, clean
  - `/Users/arimendelow/Projects/ouroboros-agent-harness`: `main`, clean

## Foundation Docs Reviewed

- `2026-04-20-2100-email-access-research-proposal`: HEY has no programmatic mailbox API; MBOX is a backfill/archive path; forwarding is useful but incomplete; mail bodies are untrusted content.
- `2026-04-20-2319-proposal-agent-native-mail`: active `@ouro.bot` Agent Mail direction; native agent mailbox and delegated human source-grants are separate compartments; hosted service routes/encrypts but does not read private mail.
- `2026-04-21-1434-ideation-agent-mail-user-stories`: the two stories must not collapse:
  - agent-native mail sense for communicating with the agent;
  - delegated human mailbox source for executive-assistant access to Ari's mailbox.
- `2026-04-21-1447-planning-agent-mail-whole-moon` and doing artifacts: local proof exists for Mail sense, bounded tools, HEY MBOX import, Screener/Imbox, retained discarded mail, Ouro Outlook, local confirmed outbound, and Azure Blob proof.
- `unit16-azure-proof`: Container Apps proof worked on port `2525`; port `25` was not proven.

## DNS Baseline

- `MX ouro.bot` currently resolves to `0 ouro-bot.mail.protection.outlook.com.`
- `TXT ouro.bot` includes:
  - `v=spf1 include:spf.protection.outlook.com -all`
  - `MS=ms39590390`
  - Google site verification
- `mx1.ouro.bot` currently resolves through Porkbun parking:
  - CNAME: `uixie.porkbun.com.`
  - A records via that target: `44.230.85.241`, `52.33.207.7`
- `ouro-bot.mail.protection.outlook.com` returned no A/CNAME result in the baseline check.

Implication: live internet mail to `slugger@ouro.bot` is not routed to Ouro Work Substrate. The observed HEY bounce is expected in this state.

## Azure/GitHub Baseline

- Azure account:
  - Subscription: `Visual Studio Enterprise Subscription` / `261e0bf1-934d-41ab-9295-229b0d254418`
  - Tenant: `a32d5dac-917a-4009-ba4b-9e6129bbeb43`
  - Signed in as: `ari@mendelow.me`
- Resource group: `rg-ouro-work-substrate`
- Container Apps environment: `ouro-prod-cae`
  - Static IP: `20.10.114.197`
  - Default domain: `blueflower-44af4710.eastus2.azurecontainerapps.io`
- Deployed apps are running:
  - `ouro-prod-mail-control`
  - `ouro-prod-mail-ingress`
  - `ouro-prod-vault-control`
- Health checks passed:
  - Mail Ingress: `ok: true`, domain `ouro.bot`, `mailboxes: 1`, `sourceGrants: 1`
  - Mail Control: `ok: true`, domain `ouro.bot`, `mailboxes: 1`, `sourceGrants: 1`
  - Vault Control: `ok: true`
- Mail Ingress configuration:
  - HTTP ingress on target port `8080`
  - Additional external TCP mapping: exposed `2525` to target `2525`
  - No port `25` mapping proven
- SMTP reachability:
  - `2525`: reachable
  - `25`: timeout
- GitHub repository secrets/variables for `ouro-work-substrate` exist for:
  - `MAIL_CONTROL_ADMIN_TOKEN`
  - `VAULT_CONTROL_ADMIN_TOKEN`
  - Azure OIDC/resource-group variables
- GitHub environment `prod` currently has no environment protection rules.
- Recent work-substrate CI/deploy runs are green.
- Main branch protection:
  - `ouro-work-substrate`: required linear history enabled, conversation resolution enabled, required checks `test` and `coverage`, strict status checks enabled.
  - `ouroboros`: required linear history enabled, conversation resolution enabled, required check `coverage`.

## Harness / Slugger Baseline

- Installed `ouro`: `/opt/homebrew/bin/ouro`
- `ouro status`:
  - Daemon version `0.1.0-alpha.464`
  - Daemon health: ok
  - Slugger enabled
  - Mail sense running as `slugger@ouro.bot`
  - Outlook: `http://127.0.0.1:6876`
- Slugger `agent.json`:
  - `senses.mail.enabled: true`
  - Vault identity: `slugger@ouro.bot`
  - Vault server: `https://vault.ouroboros.bot`
- Slugger local Mailroom registry:
  - Native mailbox: `slugger@ouro.bot`, default placement `screener`
  - Delegated HEY source grant: `me.mendelow.ari.slugger@ouro.bot`, owner `ari@mendelow.me`, source `hey`, default placement `imbox`, enabled
- Slugger Mail sense runtime:
  - Local store kind: `file`
  - Store path: `/Users/arimendelow/AgentBundles/slugger.ouro/state/mailroom`
  - Local SMTP/HTTP ports are ephemeral local ports, not production ingress.

## Expected Broken E2E Surfaces Today

- Native inbound from the public internet is broken because `ouro.bot` MX still points at Microsoft/Outlook and there is no real mailbox there.
- Delegated HEY forwarding is broken for the same reason: forwarding to `me.mendelow.ari.slugger@ouro.bot` cannot deliver until production MX points at a proven Ouro mail edge.
- Production inbound on port `25` is not ready; the live proof edge is port `2525` only.
- STARTTLS is not production-ready in the current ingress; existing code disables STARTTLS.
- Outbound production sending is not ready; current outbound status vocabulary is still too coarse and ACS/provider sending is not enabled.
- Autonomous sending is not ready; current product supports confirmed/local outbound proof, not policy-governed autonomous production sending.
- HEY full mailbox access is not complete; MBOX backfill exists locally, but future mail forwarding and brittle HEY onboarding/recovery are not productionized.

## Genuine Human Inputs Still Needed

These are the only items I should need Ari for before implementation can proceed through live cutover:

1. Porkbun API access for `ouro.bot`, entered through a hidden prompt or approved secret store, so automation can verify credentials, backup DNS, dry-run, apply, verify, and roll back records.
2. Slugger vault unlock or hidden secret entry if setup/repair needs to store Porkbun, ACS/provider, hosted Blob reader, or mail private-key material.
3. HEY browser/MFA/export/forwarding participation:
   - export Ari's HEY archive when requested;
   - configure future forwarding to `me.mendelow.ari.slugger@ouro.bot` after the destination can receive;
   - complete any HEY confirmation email or MFA step.
4. Live mail tests from human-controlled accounts after the production edge exists.
5. Outbound provider/domain verification steps if ACS or a fallback provider requires a console/email action that cannot be automated safely.

## Immediate Implementation Direction

- Do not change HEY forwarding or production MX until port `25`, STARTTLS, and rollback are proven.
- Keep `slugger@ouro.bot` as the native agent mailbox and `me.mendelow.ari.slugger@ouro.bot` as Ari's delegated HEY source alias.
- Preserve existing Microsoft verification/SPF records until DNS automation can make explicit diffs and rollback bundles.
- Implement code and docs in narrow PRs under the full-moon branch, but treat this as one end-to-end program.

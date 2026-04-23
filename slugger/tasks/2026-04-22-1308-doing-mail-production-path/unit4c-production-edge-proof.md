# Unit 4c Production SMTP Edge Proof

## Summary

Unit 4c moved the hosted mail edge from proof-only posture to a production MX edge for `ouro.bot`.

What is proven:

- `mx1.ouro.bot` resolves to the Container Apps environment static IP `20.10.114.197`.
- `ouro.bot` MX is `10 mx1.ouro.bot`.
- Mail Ingress revision `ouro-prod-mail-ingress--0000007` is healthy and serving the image tagged `d07449d811d04dd037b85f407a87c754c783f84c`.
- Azure Container Apps exposes public TCP port `25` and maps it to Mail Ingress target port `2525`.
- Mail Ingress has the TLS secret volume mounted from GitHub Actions secrets.
- The app path advertises `STARTTLS`, advertises `SIZE 26214400`, does not advertise `AUTH`, rejects unknown recipients with `550`, and rejects declared oversized messages before `DATA`.
- The certificate presented over STARTTLS is valid for `mx1.ouro.bot` through `2026-06-04T22:50:10Z`.
- DNS workflow backup/apply/verify artifacts preserve unrelated records and show no planned changes after the Porkbun priority-normalization fix.
- Mail Ingress logs inspected for this unit contain startup/config events only and no raw mail bodies.

What is intentionally not claimed yet:

- A real mailbox provider has not yet delivered a message to `slugger@ouro.bot` after MX cutover. Local direct SMTP to port `25` timed out because this machine's network also times out to Gmail MX port `25`, so local egress is blocked. The next smoke needs a human-controlled mailbox send.
- HEY export/forwarding is not configured here. Slugger should drive HEY browser/MFA/export/forwarding with browser MCP in a later unit, asking Ari only for human-only steps.
- Outbound provider sending and delivery events are not in this unit.

## Harness Support

Harness branch `slugger/mail-two-lane-contract` was advanced to commit `9d14f5dd` with:

- `ouro dns certificate`, which retrieves a binding-declared TLS bundle and stores it as an ordinary workflow-managed vault item without printing private key material.
- strict certificate-source parsing, so unknown source names no longer silently fall back to Porkbun.
- DNS verification normalization for Porkbun's default priority `0` on non-MX records while still detecting real MX priority drift.
- version bump to `@ouro.bot/cli` / `ouro.bot` `0.1.0-alpha.467`.

Harness verification:

- `unit4c-harness-focused-final.log`: focused DNS workflow tests passed.
- `unit4c-harness-full-coverage-green.log`: 483 files passed, 9169 tests passed, 100% coverage, nerves audit passed.
- `unit4c-harness-release-preflight-green.log`: release preflight passed for alpha.467.

## Live Evidence

- `unit4c-live-certificate.log`: certificate retrieved and stored at `vault:slugger:runtime/mail/certificates/mx1.ouro.bot`.
- `unit4c-github-tls-secrets.log`: GitHub TLS secrets stored from the Slugger vault item without printing values.
- `unit4c-deploy-2525-full.log`: branch deployment on proof exposed port `2525` succeeded.
- `unit4c-smtp-2525-probe.log`: SMTP policy and STARTTLS proof passed on the app path.
- `unit4c-deploy-25-full.log`: branch deployment on public exposed port `25` succeeded.
- `unit4c-azure-mail-ingress.json`: public port `25` maps to target port `2525`.
- `unit4c-azure-mail-ingress-revisions.json`: active revision is healthy, running, and has TLS secret mounts.
- `unit4c-checkhost-result.json`: external TCP to `20.10.114.197:25` succeeded from Brazil, India, and Ukraine check-host nodes; Cyprus and Iran nodes timed out.
- `unit4c-dns-apply.log` / `unit4c-dns-apply.json`: DNS apply created `mx1` A, updated root MX, and created `_dmarc`, preserving unrelated records.
- `unit4c-dns-verify-after-priority-fix.log` / `.json`: provider verification shows zero changes after normalization fix.
- `unit4c-dns-current-short.log`: current resolver view includes `mx1.ouro.bot` A, `ouro.bot` MX, and `_dmarc` TXT.
- `unit4c-health-mail-ingress-final.json`: final health check returns `ok: true`, `mailboxes: 1`, `sourceGrants: 1`.
- `unit4c-mail-ingress-logs.log`: log inspection source.
- `unit4c-secret-body-scan.log`: targeted scan found no private key, provider secret, MIME body, or probe body leakage in the live Unit 4c artifacts scanned.

## Rollback Notes

If the port-25 edge misbehaves:

1. Move traffic back to a known-good Container Apps revision with `az containerapp ingress traffic set`.
2. Use the DNS workflow backup artifact to rollback the allowlisted DNS records if the MX must leave `mx1.ouro.bot`.
3. Leave unrelated Porkbun records alone; the binding allowlist is the safety boundary.
4. Re-run health, DNS verify, and SMTP policy checks after rollback.

## Next Human Gate

Ask Ari to send a plain test email from a real mailbox provider to `slugger@ouro.bot`. That proof should verify provider delivery over public MX, encrypted Blob write, vault decryption, Screener placement, body-safe sense output, and Ouro Outlook/audit visibility.

# Security

This repo touches mail, vault accounts, cloud identity, and deployment. Treat security reports and security-adjacent surprises gently, privately, and fast.

Report security issues privately to the repository owner. Do not open public issues for secrets, mailbox access, vault provisioning, private mail keys, or deployment identity weaknesses.

## Secret Handling

- Do not commit control tokens, vault passwords, private mail keys, Azure credentials, registry credentials, or scratch files containing any of those.
- Mail Control returns newly generated private mail keys exactly once; callers must store them in the owning agent vault immediately.
- Mail Ingress stores encrypted raw MIME and encrypted private envelopes. Hosted services should not be able to read message bodies.
- GitHub Actions deploys with Azure OIDC. Do not add long-lived Azure client secrets.
- Logs may include routing metadata and health context. Logs must not include message bodies, vault passwords, private keys, bearer tokens, or raw MIME.

## Production Gates

- Production MX cutover requires final human confirmation.
- Autonomous sending requires final human confirmation.
- Port `25` must be proven before `mail_exposed_smtp_port=25` is used.
- HEY export, HEY forwarding, browser auth, and MFA remain human-at-keyboard actions.

## If You Suspect Exposure

1. Stop printing or copying the suspected secret.
2. Rotate the affected token/key if possible.
3. Check GitHub Actions logs and local shell history for accidental disclosure.
4. Record the remediation privately.
5. Add or repair a guardrail so the next agent is less likely to repeat it.

The standard is not "never make a mistake". The standard is rapid containment, honest audit, and better rails after the fact.

# Security

Report security issues privately to the repository owner. Do not open public issues for secrets, mailbox access, vault provisioning, or deployment identity weaknesses.

## Secret Handling

- Do not commit control tokens, vault passwords, private mail keys, Azure credentials, or registry credentials.
- Mail Control returns newly generated private mail keys exactly once; callers must store them in the owning agent vault immediately.
- Mail ingress stores encrypted raw MIME and encrypted private envelopes. Hosted services should not be able to read message bodies.
- GitHub Actions deploys with Azure OIDC. Do not add long-lived Azure client secrets.

## Production Gates

- Production MX cutover requires final human confirmation.
- Autonomous sending requires final human confirmation.
- Port `25` must be proven before `mail_exposed_smtp_port=25` is used.


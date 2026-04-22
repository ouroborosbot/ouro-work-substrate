# Agent Account Lifecycle

An Ouro Work account is created for an agent, not for a human. The account couples vault and mail because setup, permissions, private keys, audit, and recovery all hang from the same identity.

## Golden Path

1. The harness asks the agent to ensure its work substrate account.
2. The agent calls the local Ouro CLI. The human should not be handed raw setup commands unless the action is explicitly human-only.
3. The CLI creates or repairs the agent vault account and stores runtime credentials in the agent vault.
4. The CLI ensures a native mailbox, such as `slugger@ouro.bot`.
5. If a family member delegates mail, the CLI creates a source grant alias such as `me.mendelow.ari.slugger@ouro.bot`.
6. The hosted Mail ingress receives only public registry data and stores encrypted messages.
7. The local agent runtime decrypts mail through vault-held private keys and perceives new mail as a sense.

## Protections

- **Domain restriction:** hosted vault creation is limited to the configured substrate domain, default `ouro.bot`.
- **Authenticated control plane:** vault creation requires a bearer token file in production.
- **Rate limiting:** vault creation is rate-limited by remote address and email.
- **Secret minimization:** Vault control receives a password only to complete the Bitwarden registration request and never stores or logs it.
- **Hosted unreadability:** Mail ingress stores raw MIME and parsed private envelope encrypted to the agent's registered key.
- **Recoverable discard:** discarded mail is retained as an auditable drawer, not bounced or deleted.
- **Human-only external actions:** registrar DNS, HEY forwarding/export, browser auth, MFA, and production MX cutover stay at the keyboard.

## Existing Agents

Existing agents should be backfilled through the same idempotent ensure path as new agents. There should not be a separate migration-only trust or mail setup model.

For Slugger, the stable desired account state is:

- Vault: `slugger@ouro.bot`.
- Native mail: `slugger@ouro.bot`.
- Ari delegated HEY alias: `me.mendelow.ari.slugger@ouro.bot`.
- Private mail keys: stored only in Slugger's vault runtime config.
- Mail store: local development file store or hosted Azure Blob store, depending on deployment.

## Abuse And Recovery

The control plane should reject malformed agent ids, non-substrate domains, weak passwords, missing auth, and high-volume repeated requests. Future operator tooling should add explicit invite records, per-agent quotas, and revocation, but those should extend this single account lifecycle rather than create a parallel onboarding path.

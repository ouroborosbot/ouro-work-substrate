# Unit 0 Credential Orientation

Captured after a compaction interrupted the design conversation. This file exists so the next agent does not have to rediscover the same boundary.

## Compaction Recovery Check

- Active substrate repo: `/Users/arimendelow/Projects/ouro-work-substrate`.
- Active substrate branch: `slugger/mail-production-shape`.
- Harness task worktree inspected: `/Users/arimendelow/Projects/_worktrees/slugger-mail-production-harness`.
- Harness source-of-truth remote main inspected via `/Users/arimendelow/Projects/ouroboros-agent-harness`, whose `origin/main` includes PR #586 (`3c62b8de Add ops vault entry for Porkbun credentials`).
- Substrate task docs existed before this note but still over-emphasized Porkbun in Unit 3.

## Correct Credential Model

The harness already has the broad primitive: an agent-owned Bitwarden/Vaultwarden vault item with metadata, secret material, and notes. Future work should orient around that primitive.

The order of concepts is:

1. Generic vault item in the owning agent vault.
2. Reserved harness-readable vault items for runtime/provider/sense config when Ouro owns the runtime behavior.
3. Workflow binding that references a vault item and declares how a particular workflow should use it.
4. Optional provider template or compatibility helper.

Porkbun is currently the DNS provider for `ouro.bot`, but Porkbun is not a credential ontology. A Porkbun helper can make one workflow easier, but it must read and write ordinary vault items and must not become the model future agents copy for every provider.

## Notes Are For Orientation

Credential notes are first-class for humans and agents. They should say what the item is for, what authority it carries, how it was obtained, and what recovery path applies.

Code must not parse notes as a machine contract. Machine contracts belong in explicit fields, workflow bindings, repository config, or runbooks.

## Connect Is Not Generic Credential Entry

`ouro connect` is reserved for harness-managed capabilities whose behavior Ouro can explain, store in a known runtime location, verify, and apply. Provider auth, Perplexity, embeddings, Teams, BlueBubbles, and Agent Mail fit that model.

Registrar, cloud, deployment, billing, and similar credentials may belong in the agent vault, but they do not automatically become `ouro connect` capabilities. They should be ordinary vault items referenced by an explicit workflow binding.

## DNS Work For This Task

For this mail production task, DNS/certificate automation should be shaped as:

- a generic DNS workflow;
- a provider driver, currently Porkbun for `ouro.bot`;
- a vault item reference for the credential;
- a domain/resource allowlist outside the secret item;
- backup, dry-run, apply, verify, rollback, and audit steps;
- tests that prove secrets never appear in logs, docs, PR bodies, or process artifacts.

The existing item Ari created is still useful:

`vault:slugger:ops/registrars/porkbun/accounts/ari@mendelow.me`

Treat that as a normal Slugger vault item used by the current DNS binding, not as a special credential species.

## Documentation Debt To Pay Before Implementation

- Update harness credential docs so "vault item" is the first user-facing concept and provider helpers are described as templates or compatibility helpers.
- Add or expose a generic human-facing vault item command if it is missing; the agent-facing `credential_*` tools already point at the right primitive.
- Update substrate operations docs to describe DNS provider binding generically, with Porkbun as current `ouro.bot` driver.
- Add contract tests that prevent docs from teaching "ops credentials are different", "`ouro connect` is generic password entry", or "notes are parsed as machine config".

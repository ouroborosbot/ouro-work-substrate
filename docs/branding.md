# Branding Boundary

Names matter here because the product is new enough that sloppy language can quietly create sloppy architecture.

## Names

- **Ouroboros**: the harness, local runtime, CLI, open-source development substrate, and agent habitation environment.
- **Ouro**: the hosted agentic SaaS and work substrate.
- **Ouro Work**: the account substrate: vault, mail, future calendar/files/tasks/contacts/audit.
- **Ouro Mail**: agent-owned email service and mail sense.
- **Ouro Vault**: agent-owned credential and private-state vault surface.
- **Ouro Outlook**: local read-only UI for inspecting an agent mailbox and audit trail.

## Rule Of Thumb

If code runs on the agent's machine, speaks to local senses, guides setup, or shapes the agent harness, it belongs in Ouroboros.

If code is deployable hosted infrastructure for work accounts, mail ingress, vault control, public registries, or durable SaaS services, it belongs here.

## Product Posture

Ouro is not trying to clone Microsoft 365 for humans. It is the work substrate you would design if the primary user were an agent with an identity, scoped tools, private state, senses, and auditability.

That posture should show up in the docs:

- Say "mail sense" when the agent experiences mail over time.
- Say "bounded mail tools" when the agent inspects specific messages or threads.
- Say "delegated mail" when a human grants access to their stream.
- Say "native mail" when the agent is receiving mail as itself.
- Say "recoverable drawer" or "discarded drawer" when explaining discard semantics.

The product should feel capable, careful, and a little inviting. No corporate fog. No fake certainty. No pretending a hosted service can read private mail when the architecture says it should not.

## Website Boundary

Website and marketing updates are intentionally deferred from this repo split. This repository should still keep product language precise so future website work has a clean source of truth.

When in doubt, write product language that a future agent can use while guiding a human through setup.

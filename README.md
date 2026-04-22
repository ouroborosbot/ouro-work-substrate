# Ouro Work Substrate

Hosted services for Ouro, the agent-first work substrate.

This repository is the deployable service boundary for agent-owned work accounts: `Ouro Mail`, `Ouro Vault`, and the shared protocol they use to stay private, auditable, and pleasant for agents to inhabit.

## Brand Boundary

- **Ouroboros** is the open-source harness and local runtime: agents, senses, CLI, skills, Outlook UI, and local development loops.
- **Ouro** is the hosted work substrate: private agent accounts with mail, vault, contacts, audit, and future work surfaces.

Website and marketing updates are intentionally out of scope for this repository split.

## Packages

- `packages/work-protocol`: shared mail/vault records, address routing, encryption, screener placement, and registry helpers.
- `apps/mail-ingress`: SMTP ingress plus health endpoint for agent mailboxes. It accepts registered recipients, stores encrypted envelopes, and leaves human and agent secrets out of the hosted service.
- `apps/vault-control`: authenticated control-plane service for programmatic Vaultwarden account creation.
- `infra/azure`: Azure Container Apps and Blob Storage deployment skeleton for the hosted substrate.

## Development

```bash
npm install
npm test
npm run build
```

The services use explicit CLI arguments and committed deployment templates. Do not add secret-bearing environment variables as the configuration contract.

## Deployment Shape

The default Azure deployment puts Mail ingress and Vault control in Container Apps with a user-assigned managed identity. Mail data lands in Azure Blob Storage under encrypted records; private mail keys and vault credentials remain in the owning agent vault.

See [Azure deployment](docs/deployment-azure.md), [architecture](docs/architecture.md), and [agent account lifecycle](docs/agent-account-lifecycle.md).

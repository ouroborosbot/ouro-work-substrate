# Azure Deployment

Azure is the first hosted home for Ouro Work. The goal is not to be clever; the goal is to have a clean, reproducible cloud shape that future agents can reason about without spelunking through portal state.

The templates in `infra/azure` deploy these primitives:

- Azure Blob Storage for encrypted mail objects and the public mail registry.
- Azure Container Registry for deployable service images.
- A user-assigned managed identity for Container Apps.
- A VNet plus delegated Container Apps subnet for external TCP ingress.
- Azure Container Apps for Mail Ingress, Mail Control, and Vault Control.
- Log Analytics for Container Apps logs.
- Role assignments for ACR pulls and Blob access.

## Container Apps Ingress

Mail Ingress exposes HTTP health on the app's primary HTTP ingress and SMTP as an additional TCP port. Azure Container Apps supports `additionalPortMappings` for extra TCP ports, and externally exposed TCP ports must be unique within the environment.

External TCP ingress also requires a Container Apps environment using a virtual network, so the template creates a delegated Container Apps subnet.

The current proof port is `2525`. Do not switch to port `25` or publish MX records until the production ingress decision is explicitly confirmed.

## Deploy

Bootstrap Azure OIDC, GitHub repo variables, and resource-group permissions once:

```bash
scripts/bootstrap-azure-github-oidc.sh ouroborosbot/ouro-work-substrate rg-ouro-work-substrate eastus2 prod
```

Set the two control-plane tokens as GitHub secrets:

```bash
gh secret set MAIL_CONTROL_ADMIN_TOKEN --repo ouroborosbot/ouro-work-substrate
gh secret set VAULT_CONTROL_ADMIN_TOKEN --repo ouroborosbot/ouro-work-substrate
```

After that, merges to `main` deploy automatically after green CI.

Manual deploy is still available for repairs, token rotation, and proof-port changes:

```bash
gh workflow run deploy-azure.yml --repo ouroborosbot/ouro-work-substrate
```

The workflow bootstraps or repairs ACR, builds and pushes all service images, then deploys Container Apps through Bicep. Control tokens are GitHub secrets passed as secure Bicep parameters; do not commit token values.

## OIDC Shape

The deploy identity is a user-assigned managed identity named for the environment, for example `id-ourowork-github-prod`.

It needs federated credentials for both subjects:

- `repo:ouroborosbot/ouro-work-substrate:ref:refs/heads/main`
- `repo:ouroborosbot/ouro-work-substrate:environment:prod`

The environment subject is required because the deploy workflow uses a GitHub Environment. If Azure login fails with "No matching federated identity record", rerun the bootstrap script and verify both credentials exist.

## DNS

For production mail, point the relevant MX record at the Container Apps environment endpoint only after a live ingress proof and final human confirmation. HEY forwarding/catch-all setup remains human-at-keyboard.

Until then, use the proof SMTP port and direct test sends. The system should prove mail routing, encrypted storage, and agent-side decryption before real inbound mail depends on it.

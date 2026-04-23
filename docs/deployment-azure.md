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

Mail Ingress can advertise SMTP `STARTTLS` when the deploy workflow receives both PEM secrets:

```bash
gh secret set MAIL_INGRESS_TLS_KEY --repo ouroborosbot/ouro-work-substrate < tls.key
gh secret set MAIL_INGRESS_TLS_CERT --repo ouroborosbot/ouro-work-substrate < tls.crt
```

The key and certificate are passed as secure Bicep parameters and mounted as secret files in the Mail Ingress container. Configure both or neither. The workflow rejects a half-configured pair; with neither configured, STARTTLS stays disabled and the edge is not ready for production MX.

The SMTP transaction recipient cap is controlled by the optional `AZURE_MAIL_INGRESS_MAX_RECIPIENTS` repository variable. The default is `100`. Connection pressure has separate optional variables: `AZURE_MAIL_INGRESS_MAX_CONNECTIONS` defaults to `100` concurrent clients per replica, `AZURE_MAIL_INGRESS_CONNECTION_RATE_LIMIT_MAX` defaults to `120`, and `AZURE_MAIL_INGRESS_CONNECTION_RATE_LIMIT_WINDOW_MS` defaults to `60000`.

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

Set `MAIL_INGRESS_TLS_KEY` and `MAIL_INGRESS_TLS_CERT` before any production MX proof. They are optional only for local/proof deployments that intentionally keep STARTTLS disabled.

After that, runtime, infrastructure, and workflow changes merged to `main` deploy automatically after green CI. Docs-only changes pass CI and skip Azure rollout.

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

For production mail, point the relevant MX record at the Container Apps environment endpoint only after a live ingress proof and operator acceptance for this private rollout. HEY forwarding/catch-all setup remains human-at-keyboard.

Until then, use the proof SMTP port and direct test sends. The system should prove mail routing, encrypted storage, and agent-side decryption before real inbound mail depends on it.

# Azure Deployment

The Azure template in `infra/azure/main.bicep` deploys the hosted substrate primitives:

- Azure Blob Storage for encrypted mail objects.
- A user-assigned managed identity for services.
- A VNet plus delegated Container Apps subnet for external TCP ingress.
- Azure Container Apps for Mail ingress, Mail control, and Vault control.
- Azure Container Registry for deployable service images.
- Log Analytics for Container Apps logs.
- A Storage Blob Data Contributor role assignment for Mail ingress.

## Container Apps Ingress

Mail ingress exposes HTTP health on the app's primary HTTP ingress and SMTP as an additional TCP port. Azure Container Apps supports `additionalPortMappings` for extra TCP ports, and externally exposed TCP ports must be unique within the environment. External TCP ingress also requires a Container Apps environment using a virtual network, so the template creates a delegated Container Apps subnet.

## Deploy

Use the manual **Deploy Azure** GitHub workflow after bootstrap:

```bash
scripts/bootstrap-azure-github-oidc.sh ouroborosbot/ouro-work-substrate rg-ouro-work-substrate eastus2 prod
gh secret set MAIL_CONTROL_ADMIN_TOKEN --repo ouroborosbot/ouro-work-substrate
gh secret set VAULT_CONTROL_ADMIN_TOKEN --repo ouroborosbot/ouro-work-substrate
gh workflow run deploy-azure.yml --repo ouroborosbot/ouro-work-substrate
```

The workflow bootstraps ACR, builds and pushes all service images, then deploys Container Apps through Bicep. Control tokens are GitHub secrets passed as secure Bicep parameters; do not commit token values.

## DNS

For production mail, point the relevant MX record at the Container Apps environment endpoint only after a live ingress proof and final human confirmation. HEY forwarding/catch-all setup remains human-at-keyboard.

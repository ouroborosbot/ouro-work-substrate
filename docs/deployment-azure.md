# Azure Deployment

The Azure template in `infra/azure/main.bicep` deploys the hosted substrate primitives:

- Azure Blob Storage for encrypted mail objects.
- A user-assigned managed identity for services.
- A VNet plus delegated Container Apps subnet for external TCP ingress.
- Azure Container Apps for Mail ingress and Vault control.
- A Storage Blob Data Contributor role assignment for Mail ingress.

## Container Apps Ingress

Mail ingress exposes HTTP health on the app's primary HTTP ingress and SMTP as an additional TCP port. Azure Container Apps supports `additionalPortMappings` for extra TCP ports, and externally exposed TCP ports must be unique within the environment. External TCP ingress also requires a Container Apps environment using a virtual network, so the template creates a delegated Container Apps subnet.

## Deploy

```bash
az deployment group create \
  --resource-group <resource-group> \
  --template-file infra/azure/main.bicep \
  --parameters \
    location=<region> \
    mailIngressImage=<registry>/ouro-mail-ingress:<tag> \
    vaultControlImage=<registry>/ouro-vault-control:<tag> \
    vaultServerUrl=https://vault.ouroboros.bot \
    vaultControlAdminToken=<human-generated-token>
```

The template intentionally takes the control token as a deployment parameter so production can later move it into Key Vault without changing service code. Do not commit token values.

## DNS

For production mail, point the relevant MX record at the Container Apps environment endpoint only after a live ingress proof and final human confirmation. HEY forwarding/catch-all setup remains human-at-keyboard.

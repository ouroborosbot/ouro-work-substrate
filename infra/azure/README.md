# Azure Infra

This directory is the cloud shape for Ouro Work. Keep it reproducible, boring in the best way, and easy for a future agent to inspect without opening the Azure portal.

## Files

- `registry.bicep`: creates or repairs Azure Container Registry so the deploy workflow has a place to push images.
- `main.bicep`: deploys Storage, managed identity, Container Apps environment, Mail Ingress, Mail Control, Vault Control, and role assignments.

## Design Notes

- Mail Ingress runs with explicit CLI args and managed identity access to Blob Storage.
- Mail Control writes the public registry in Blob Storage and returns generated private keys to the caller once.
- Vault Control runs behind a bearer-token control plane.
- Hosted services avoid reading from agent vaults. They receive public registry data and store encrypted payloads.
- The SMTP app target port is `2525`; the exposed SMTP port is parameterized. Current production exposes public port `25` for MX traffic.
- Mail Ingress STARTTLS is enabled only when both `MAIL_INGRESS_TLS_KEY` and `MAIL_INGRESS_TLS_CERT` are configured as GitHub secrets. The deploy workflow rejects a half-configured pair.
- Recipient, concurrent connection, and connection-rate limits are Bicep parameters fed from optional GitHub repository variables.

## Validate

```bash
az bicep build --file infra/azure/main.bicep
az bicep build --file infra/azure/registry.bicep
```

`npm run ci:local` runs those checks after the TypeScript/test suite.

## Deploy

Prefer the GitHub **Deploy Azure** workflow. It handles ACR, image tags, secure parameters, and Bicep deployment in the same path CI expects.

Use direct `az deployment group create` only for focused debugging, and copy any lasting lesson back into `docs/operations.md`.

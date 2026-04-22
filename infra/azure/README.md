# Azure Infra

`main.bicep` is the first production-oriented Azure shape for Ouro Work:

- Mail ingress runs with explicit CLI args and managed identity access to Blob Storage.
- Vault control runs as an internal-ish control service with a bearer token secret.
- Hosted services avoid reading from agent vaults. They receive public registry data and store encrypted payloads.

Validate locally with:

```bash
az bicep build --file infra/azure/main.bicep
```

Then deploy from a resource group with `az deployment group create`.


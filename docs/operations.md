# Operations

## Services

- `mail-ingress`: SMTP ingress plus health endpoint. It reads the public registry from Blob Storage and stores encrypted mail objects in Blob Storage.
- `mail-control`: authenticated mailbox control plane. It updates the public registry and returns newly generated private keys once.
- `vault-control`: authenticated Vaultwarden account creation control plane.

## Secrets

GitHub repository secrets:

- `MAIL_CONTROL_ADMIN_TOKEN`
- `VAULT_CONTROL_ADMIN_TOKEN`

GitHub repository variables:

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_RESOURCE_GROUP`
- `AZURE_LOCATION`
- `AZURE_ENVIRONMENT_NAME`

Bootstrap or repair them with:

```bash
scripts/bootstrap-azure-github-oidc.sh ouroborosbot/ouro-work-substrate rg-ouro-work-substrate eastus2 prod
```

## Deploy

Use the manual GitHub workflow:

```bash
gh workflow run deploy-azure.yml --repo ouroborosbot/ouro-work-substrate
```

The workflow creates or updates ACR, builds/pushes all service images, and deploys Container Apps with Bicep.

## Smoke Test

After deployment:

1. Open the `Deploy Azure` workflow outputs.
2. Check `mailControlFqdn`, `vaultControlFqdn`, and `mailIngressFqdn`.
3. Call `GET /health` on each HTTPS endpoint.
4. Call `POST /v1/mailboxes/ensure` on Mail Control with a bearer token and verify it returns `slugger@ouro.bot` plus new private keys only on the first call.
5. Send SMTP to the proof TCP port, currently `2525`, and verify accepted mail appears encrypted in Blob Storage.
6. Verify the agent can decrypt through vault-held keys before any HEY forwarding or MX change.

## Rollback

Container Apps keeps revisions. If a deploy is bad:

```bash
az containerapp revision list --resource-group <rg> --name <app>
az containerapp ingress traffic set --resource-group <rg> --name <app> --revision-weight <known-good>=100
```

Keep the previous image tags available in ACR until a newer deployment is proven.

## Token Rotation

1. Generate a new high-entropy token.
2. Update the matching GitHub secret.
3. Rerun `Deploy Azure`.
4. Confirm old tokens are rejected by the control endpoint.

## Scaling

Mail ingress defaults to one minimum replica and five maximum replicas. Increase `mailIngressMaxReplicas` in Bicep after measuring SMTP proof traffic. Control services default to smaller replica caps because they are low-volume authenticated APIs.

## Human-Only Gates

- DNS/MX changes.
- HEY export and forwarding setup.
- Browser auth and MFA.
- Production MX cutover.
- Autonomous sending.


# Operations

This is the runbook for keeping Ouro Work calm in production. It should read like something you can trust when you are tired: direct commands, clear checks, and enough context to remember why the steps matter.

## Services

- `mail-ingress`: SMTP ingress plus HTTP health. It reads the public registry from Blob Storage and stores encrypted mail objects in Blob Storage.
- `mail-control`: authenticated mailbox control plane. It updates the public registry and returns newly generated private keys once.
- `vault-control`: authenticated Vaultwarden account creation control plane.

Current proof deployment:

- Resource group: `rg-ouro-work-substrate`.
- Environment: `prod`.
- Region: `eastus2`.
- SMTP proof port: `2525`.
- Production MX: not cut over.

## Daily Confidence Check

Use this when you just need to know whether the house is standing.

1. Check latest GitHub runs:

   ```bash
   gh run list --repo ouroborosbot/ouro-work-substrate --limit 8
   ```

2. Confirm no open PRs are waiting unexpectedly:

   ```bash
   gh pr list --repo ouroborosbot/ouro-work-substrate
   ```

3. Check deployed app health using the current deploy outputs or known FQDNs:

   ```bash
   curl -fsS https://<mail-control-fqdn>/health
   curl -fsS https://<mail-ingress-fqdn>/health
   curl -fsS https://<vault-control-fqdn>/health
   ```

Healthy means all three return `ok: true`, and Mail Control plus Mail Ingress agree on mailbox/source-grant counts.

## Secrets And Variables

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
- Optional: `AZURE_MAIL_EXPOSED_SMTP_PORT`

Bootstrap or repair Azure OIDC, repo variables, and resource-group role assignments with:

```bash
scripts/bootstrap-azure-github-oidc.sh ouroborosbot/ouro-work-substrate rg-ouro-work-substrate eastus2 prod
```

That script creates both accepted GitHub OIDC subjects:

- `repo:ouroborosbot/ouro-work-substrate:ref:refs/heads/main`
- `repo:ouroborosbot/ouro-work-substrate:environment:prod`

The second one matters because the deploy workflow uses the `prod` GitHub Environment.

## Registrar Ops Credentials

Registrar API credentials are operational secrets, not harness connectors. Store them in the owning agent vault under an `ops/...` item and keep domain allowlists in this repository's DNS workflow or runbook.

For Porkbun, the API key pair is account-scoped. A domain's Porkbun API Access toggle only allows that account-level key to operate on that domain; it is not the credential identity.

Use the harness hidden prompt:

```bash
ouro vault ops porkbun set --agent slugger --account ari@mendelow.me
```

That stores the structured secret at:

```text
vault:slugger:ops/registrars/porkbun/accounts/ari@mendelow.me
```

DNS automation must bind domains to that item outside the secret, for example:

```text
ouro.bot -> ops/registrars/porkbun/accounts/ari@mendelow.me
```

Do not name account-level keys after domains, and do not use `ouro connect` for registrar credentials unless the harness later owns a first-class registrar capability with verification and runtime semantics.

## Deploy

Runtime, infrastructure, and workflow changes merged to `main` deploy automatically after the `CI` workflow completes successfully. Docs-only changes pass CI but skip Azure rollout. When deployment is needed, the workflow checks out the exact CI-tested commit, builds all service images, pushes them to ACR, and applies the Container Apps Bicep deployment.

Use manual deployment for intentional redeploys, token rotation, or proof-port changes:

```bash
gh workflow run deploy-azure.yml --repo ouroborosbot/ouro-work-substrate
```

The deployment is serialized per environment so only one production rollout runs at a time. Prefer this workflow over local one-off deploys; the workflow is the paved path.

## Smoke Test

Run this after a meaningful deployment. Do not skip the encryption/decryption proof when mail code or infra changed.

1. Open the `Deploy Azure` workflow outputs.
2. Record `mailControlFqdn`, `vaultControlFqdn`, `mailIngressFqdn`, and `mailSmtpPort`.
3. Call `GET /health` on each HTTPS endpoint.
4. Verify unauthenticated Mail Control and Vault Control mutations return `401`.
5. Call `POST /v1/mailboxes/ensure` on Mail Control with a bearer token.
6. Verify first creation returns private keys and repeated ensure calls return zero new keys.
7. Send SMTP to the proof TCP port, currently `2525`.
8. Verify accepted mail appears in Blob Storage as encrypted mail.
9. Decrypt through the private keys stored in the owning agent vault or, during first proof only, the one-time keys returned by Mail Control.
10. Confirm native mail lands in Screener and delegated HEY alias mail lands in Imbox with owner/source provenance.

For Slugger, the expected public addresses are:

- Native: `slugger@ouro.bot`.
- HEY delegated alias: `me.mendelow.ari.slugger@ouro.bot`.

## Rollback

Container Apps keeps revisions. If a deploy is bad, move traffic back to a known-good revision:

```bash
az containerapp revision list --resource-group <rg> --name <app>
az containerapp ingress traffic set --resource-group <rg> --name <app> --revision-weight <known-good>=100
```

Rollback all affected apps together when a protocol change spans services. Keep previous image tags available in ACR until the newer deployment is proven.

After rollback, run health checks and a focused smoke test for the affected surface.

## Token Rotation

1. Generate a new high-entropy token.
2. Update the matching GitHub secret.
3. Rerun `Deploy Azure`.
4. Confirm the new token works.
5. Confirm the old token is rejected.

The control services read token files at request time, so a rotated mounted secret does not depend on stale process memory.

## Scaling

Current defaults:

- Mail ingress: `minReplicas=1`, `maxReplicas=5`.
- Mail Control: `minReplicas=1`, `maxReplicas=3`.
- Vault Control: `minReplicas=1`, `maxReplicas=2`.

Scale Mail ingress first for inbound SMTP volume. Scale control services only after measuring setup traffic; they are authenticated, low-volume APIs.

Before raising replica caps, check:

- whether registry refresh cadence is still appropriate;
- whether Blob Storage request volume is healthy;
- whether SMTP proof traffic needs a production mail edge rather than just more Container App replicas;
- whether sender-policy and screener flows are keeping up operationally.

## Human-Only Gates

These are not chores for an agent to quietly complete. They require explicit human action:

- DNS/MX changes.
- HEY export and forwarding setup.
- Browser auth and MFA.
- Production MX cutover.
- Autonomous sending.

## If Something Feels Weird

Prefer evidence over vibes:

1. Check GitHub run logs.
2. Check Container App health.
3. Check latest deployment outputs.
4. Check whether Mail Control and Mail Ingress agree on registry counts.
5. Check Blob records without printing private mail content.
6. Check vault-held private keys on the local agent side.

Leave a note in the docs when you discover a new production edge. The next agent should not have to meet the same sharp corner by surprise.

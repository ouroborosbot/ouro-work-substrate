# Deployment Story

This repository is the hosted service home for Ouro Work. It does not replace the local Ouroboros harness runtime yet.

## Current State

- Hosted service code lives here: shared protocol, Mail ingress, Mail control, Vault control, Dockerfiles, and Azure infra.
- The Ouroboros harness still owns local setup commands, the Mail sense, bounded mail tools, local development stores, and Ouro Outlook.
- The previous Azure proof used harness-packaged Mailroom code. This repo is the cleaned-up hosted source of truth for the next proof.
- Production DNS/MX cutover has not happened.
- Autonomous sending is not enabled.

## What CI Must Prove

The `CI` workflow runs on PRs and pushes to `main`:

- `npm ci`
- `npm test`
- `az bicep build --file infra/azure/main.bicep`
- `az bicep build --file infra/azure/registry.bicep`
- Docker build for `apps/mail-control`
- Docker build for `apps/mail-ingress`
- Docker build for `apps/vault-control`

Those checks are intentionally boring: the hosted service should always be buildable before anyone thinks about Slugger live mail.

## Deployment Phases

### Phase 1: Local And CI Proof

Run the services locally where possible, validate protocol behavior with tests, compile Azure infra, and build both container images in CI.

Status: active.

### Phase 2: Azure Proof Deployment

Build and push images to ACR, then deploy `infra/azure/main.bicep` into an Azure resource group with the manual **Deploy Azure** workflow. The proof should use external TCP `2525` first and verify:

- Mail Control can create `slugger@ouro.bot` and `me.mendelow.ari.slugger@ouro.bot` in the Blob-backed public registry.
- SMTP recipient rejection for unknown recipients.
- Accepted mail lands in Azure Blob Storage encrypted.
- Slugger can decrypt through vault-held private keys.
- Health endpoints are reachable.
- Vault control rejects unauthenticated and non-`ouro.bot` account requests.

Status: ready to run from this repo after GitHub OIDC and control-token secrets are present.

### Phase 3: Production Ingress Decision

Decide whether Azure Container Apps can support the final production MX path on port `25`. If not, keep Container Apps for control/services and add a small Azure mail edge for SMTP ingress.

Status: open. Do not publish production MX until this is proven.

### Phase 4: Deployment Automation

Phase 4 is push-to-main deployment. Only after Phase 2 succeeds and Phase 3 is settled, add push-triggered deployment:

- Push-to-main deployment only after manual deploys are boring.

Status: intentionally deferred. Manual deploy exists; automatic deployment should not be enabled before the Azure mail-ingress proof is boring.

## Branch Protection

`main` should require the CI `test` status check before merge. Admins may still need emergency bypass while this repo is young, but normal work should flow through PRs.

Dependabot watches npm and GitHub Actions weekly. CODEOWNERS routes all changes to the repository owner until a broader Ouro operations team exists.

## Slugger Testing Impact

Slugger local testing can resume before auto-deployment. These are not blocked by hosted deployment automation:

- HEY MBOX import.
- Local Mail sense readiness.
- Bounded mail reads.
- Screener decisions.
- Ouro Outlook audit.

Live inbound forwarding to `@ouro.bot` should wait for the Azure proof deployment and production ingress decision.

# Deployment Story

This repository is the hosted service home for Ouro Work. It does not replace the local Ouroboros harness runtime; it gives that runtime a clean, deployable service boundary for mail, vault, and future work surfaces.

This doc is the memory of how the deploy story changed. Keep it honest. A future agent should be able to tell what is proven, what is gated, and what is merely imagined.

## Current State

- Hosted service code lives here: shared protocol, Mail Ingress, Mail Control, Vault Control, Dockerfiles, and Azure infra.
- The Ouroboros harness still owns local setup commands, the Mail sense, bounded mail tools, local development stores, and Ouro Outlook.
- Azure proof deployment is live from this repo.
- Runtime, infrastructure, and workflow changes on `main` deploy automatically after green CI through GitHub OIDC; docs-only changes skip Azure rollout.
- Mail proof SMTP is on port `2525`.
- Mail Ingress code and deploy templates support STARTTLS from mounted PEM secrets, SMTP `SIZE`, connection/rate limits, recipient transaction limits, unknown-recipient rejection, and body-safe transient failure logging.
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

Status: complete and continuously enforced.

### Phase 2: Azure Proof Deployment

Build and push images to ACR, then deploy `infra/azure/main.bicep` into an Azure resource group with the manual **Deploy Azure** workflow. The proof should use external TCP `2525` first and verify:

- Mail Control can create `slugger@ouro.bot` and `me.mendelow.ari.slugger@ouro.bot` in the Blob-backed public registry.
- SMTP recipient rejection for unknown recipients.
- Accepted mail lands in Azure Blob Storage encrypted.
- Slugger can decrypt through vault-held private keys.
- Health endpoints are reachable.
- Vault control rejects unauthenticated and non-`ouro.bot` account requests.

Status: complete. The live proof verified native `slugger@ouro.bot` mail to Screener, delegated `me.mendelow.ari.slugger@ouro.bot` mail to Imbox, encrypted Blob storage, and decryption with the one-time private key returned by Mail Control.

### Phase 3: Production Ingress Decision

Decide whether Azure Container Apps can support the final production MX path on port `25`. If not, keep Container Apps for control/services and add a small Azure mail edge for SMTP ingress.

Status: open. The app path is being hardened for production SMTP, but do not publish production MX until a live port-25 proof shows the edge can accept real MX traffic with STARTTLS and body-safe observability.

### Phase 4: Deployment Automation

Phase 4 is deploy-after-green-CI automation. It should use the exact CI-tested commit, Azure OIDC, ACR image tags tied to the commit SHA, serialized environment deployment, and docs-only skip behavior.

Status: complete. A workflow-run deploy now starts after successful `CI` on `main`, skips docs-only commits, and the `prod` GitHub Environment OIDC subject is authorized in Azure.

Manual deployment remains available for token rotation, repairs, and proof-port changes.

### Phase 5: Production Mail Edge

Phase 5 is the real inbound mail decision: production MX, port `25`, DNS, HEY forwarding, and operational monitoring.

Status: gated on live proof, not a separate approval ceremony. This may require a dedicated Azure mail edge if Container Apps is not the right final SMTP endpoint. The current deploy lane keeps hosted services as private commit-addressed Docker images built by GitHub Actions and applied through Bicep; these services are not published as npm packages.

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

Live inbound forwarding to `@ouro.bot` should wait for the production ingress decision and explicit human action.

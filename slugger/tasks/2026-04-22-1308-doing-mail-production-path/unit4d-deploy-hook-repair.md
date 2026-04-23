# Unit 4d Deployment Hook Repair

This was found immediately after Unit 4c merged. The hosted services were already manually deployed at the runtime commit used for the port-25 proof, so production was not down. The automated deploy lane still had a production-grade correctness bug.

## Bug

`.github/workflows/deploy-azure.yml` made its docs-only skip decision from:

```bash
git diff --name-only "${DEPLOY_SHA}^" "${DEPLOY_SHA}"
```

That is too narrow for a rebase/linear-history merge where the final commit is docs-only but earlier commits in the same push contain runtime, infra, or workflow changes. In that case, the workflow could skip Azure even though production was still running an older commit-tagged image.

The invariant is:

> A deploy skip is safe only when the current deployed commit-tagged image is an ancestor of the CI-tested commit and every file changed since that deployed image is documentation-only.

If the current deployed image cannot be inspected, cannot be parsed as a commit SHA, is not present in the checkout, or is not an ancestor of the tested commit, deploy conservatively.

## Fix

- Added `scripts/should-auto-deploy-between.sh`.
- Kept `scripts/should-auto-deploy.sh` as the pure path classifier.
- Changed the deploy workflow to:
  - check out full history for the CI-tested commit;
  - log in to Azure before the deployment decision;
  - inspect the current `ouro-${AZURE_ENVIRONMENT_NAME}-mail-ingress` Container App image;
  - extract the commit tag from the `mail-ingress` container image;
  - compare that deployed SHA to `DEPLOY_SHA`;
  - deploy if any non-doc path changed anywhere in that range;
  - skip only for range-wide docs-only changes.
- Updated operations and deployment-story docs so future agents do not repeat the head-commit mistake.

## Test Evidence

Red before implementation:

```text
npx vitest run scripts/__tests__/should-auto-deploy.test.ts
4 failed | 4 passed
bash: scripts/should-auto-deploy-between.sh: No such file or directory
```

Green after implementation:

```text
npx vitest run scripts/__tests__/should-auto-deploy.test.ts
1 passed
8 passed
```

Full local gate after docs/workflow updates:

```text
npm run ci:local
16 test files passed
102 tests passed
100% statements / branches / functions / lines
az bicep build infra/azure/main.bicep passed
az bicep build infra/azure/registry.bicep passed
```

The focused tests cover:

- runtime changes earlier in the deployed-image-to-tested-commit range followed by a docs-only head commit;
- range-wide docs-only changes;
- invalid deployed image SHA;
- deployed image SHA not being an ancestor of the tested commit.

## Operational Meaning

The hosted substrate remains a private deployed-service lane: commit-addressed Docker images plus Bicep/GitHub Actions, not an npm package. The harness remains the npm-published product lane. This repair makes the hosted lane trustworthy enough to use as the paved post-merge path instead of relying on local one-off deploys.

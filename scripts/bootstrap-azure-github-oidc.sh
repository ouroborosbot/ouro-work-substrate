#!/usr/bin/env bash
set -euo pipefail

repo="${1:-ouroborosbot/ouro-work-substrate}"
resource_group="${2:-rg-ouro-work-substrate}"
location="${3:-eastus2}"
environment_name="${4:-prod}"

subscription_id="$(az account show --query id -o tsv)"
tenant_id="$(az account show --query tenantId -o tsv)"
identity_name="id-ourowork-github-${environment_name}"
scope="/subscriptions/${subscription_id}/resourceGroups/${resource_group}"

az group create \
  --name "$resource_group" \
  --location "$location" \
  --tags product=ouro component=work-substrate environment="$environment_name" \
  >/dev/null

az identity create \
  --resource-group "$resource_group" \
  --name "$identity_name" \
  --location "$location" \
  --tags product=ouro component=github-deploy environment="$environment_name" \
  >/dev/null

client_id="$(az identity show --resource-group "$resource_group" --name "$identity_name" --query clientId -o tsv)"
principal_id="$(az identity show --resource-group "$resource_group" --name "$identity_name" --query principalId -o tsv)"

ensure_federated_credential() {
  local credential_name="$1"
  local subject="$2"
  if ! az identity federated-credential show \
    --resource-group "$resource_group" \
    --identity-name "$identity_name" \
    --name "$credential_name" \
    >/dev/null 2>&1; then
    az identity federated-credential create \
      --resource-group "$resource_group" \
      --identity-name "$identity_name" \
      --name "$credential_name" \
      --issuer "https://token.actions.githubusercontent.com" \
      --subject "$subject" \
      --audience "api://AzureADTokenExchange" \
      >/dev/null
  fi
}

ensure_federated_credential "github-main" "repo:${repo}:ref:refs/heads/main"
ensure_federated_credential "github-environment-${environment_name}" "repo:${repo}:environment:${environment_name}"

for role in "Contributor" "User Access Administrator" "AcrPush"; do
  if ! az role assignment list \
    --assignee "$principal_id" \
    --scope "$scope" \
    --query "[?roleDefinitionName=='${role}'] | length(@)" \
    -o tsv | grep -q '^1$'; then
    az role assignment create \
      --assignee-object-id "$principal_id" \
      --assignee-principal-type ServicePrincipal \
      --role "$role" \
      --scope "$scope" \
      >/dev/null
  fi
done

gh variable set AZURE_CLIENT_ID --repo "$repo" --body "$client_id"
gh variable set AZURE_TENANT_ID --repo "$repo" --body "$tenant_id"
gh variable set AZURE_SUBSCRIPTION_ID --repo "$repo" --body "$subscription_id"
gh variable set AZURE_RESOURCE_GROUP --repo "$repo" --body "$resource_group"
gh variable set AZURE_LOCATION --repo "$repo" --body "$location"
gh variable set AZURE_ENVIRONMENT_NAME --repo "$repo" --body "$environment_name"

echo "GitHub OIDC deploy identity ready for ${repo}"
echo "resource group: ${resource_group}"
echo "identity: ${identity_name}"

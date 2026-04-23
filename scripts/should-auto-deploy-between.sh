#!/usr/bin/env bash
set -euo pipefail

deployed_sha="${1:-}"
deploy_sha="${2:-}"
changed_files_path="${3:-changed-files.txt}"
reason_path="${4:-auto-deploy-reason.txt}"
path_classifier="${AUTO_DEPLOY_PATH_CLASSIFIER:-scripts/should-auto-deploy.sh}"

mkdir -p "$(dirname "$changed_files_path")" "$(dirname "$reason_path")"
: > "$changed_files_path"
: > "$reason_path"

write_reason() {
  printf '%s\n' "$1" > "$reason_path"
}

deploy_conservatively() {
  write_reason "$1"
  echo "true"
}

if [[ -z "$deploy_sha" ]] || ! git rev-parse --verify --quiet "${deploy_sha}^{commit}" >/dev/null; then
  deploy_conservatively "Deploy SHA is missing or invalid; deploying conservatively."
  exit 0
fi

if [[ -z "$deployed_sha" ]] || ! [[ "$deployed_sha" =~ ^[0-9a-fA-F]{40}$ ]]; then
  deploy_conservatively "Deployed image SHA is missing or invalid; deploying conservatively."
  exit 0
fi

if ! git rev-parse --verify --quiet "${deployed_sha}^{commit}" >/dev/null; then
  deploy_conservatively "Deployed image SHA is not present in this checkout; deploying conservatively."
  exit 0
fi

if ! git merge-base --is-ancestor "$deployed_sha" "$deploy_sha"; then
  deploy_conservatively "Deployed image SHA is not an ancestor of the tested commit; deploying conservatively."
  exit 0
fi

git diff --name-only "$deployed_sha" "$deploy_sha" > "$changed_files_path"
should_deploy="$(bash "$path_classifier" < "$changed_files_path")"

if [[ "$should_deploy" == "true" ]]; then
  write_reason "Runtime, infrastructure, or workflow files changed since deployed image; deploying."
elif [[ -s "$changed_files_path" ]]; then
  write_reason "Only documentation files changed since deployed image; skipping Azure deployment."
else
  write_reason "No changes since deployed image; skipping Azure deployment."
fi

echo "$should_deploy"

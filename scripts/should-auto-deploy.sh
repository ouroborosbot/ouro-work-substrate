#!/usr/bin/env bash
set -euo pipefail

should_deploy=false

while IFS= read -r changed_path; do
  [[ -z "$changed_path" ]] && continue
  case "$changed_path" in
    *.md|docs/*)
      ;;
    *)
      should_deploy=true
      break
      ;;
  esac
done

if [[ "$should_deploy" == true ]]; then
  echo "true"
else
  echo "false"
fi

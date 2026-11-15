#!/usr/bin/env bash
# On agent stop: if Proposal Engine proposal presentation files changed,
# nudge one follow-up so multi-format export QA is not skipped.
set -euo pipefail

input=$(cat)
status=$(printf '%s' "$input" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("status",""))' 2>/dev/null || true)
loop_count=$(printf '%s' "$input" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("loop_count",0))' 2>/dev/null || echo 0)

if [[ "$status" != "completed" ]]; then
  echo '{}'
  exit 0
fi

# Only one automatic follow-up per stop chain.
if [[ "${loop_count:-0}" != "0" ]]; then
  echo '{}'
  exit 0
fi

# Detect PE proposal visual / export paths in the working tree.
changed=$(
  {
    git diff --name-only 2>/dev/null || true
    git diff --cached --name-only 2>/dev/null || true
    git ls-files --others --exclude-standard 2>/dev/null || true
  } | grep -E '^proposal-engine/frontend/(src/proposal/(exportPdf|exportDocx|exportPpt|ProposalDocumentBlocks|ProposalPreview|proposalCopy)|public/(closing_note_solar|.*_solar_setup)|src/pages/ProposalPreview)' \
    || true
)

if [[ -z "${changed// }" ]]; then
  echo '{}'
  exit 0
fi

python3 - <<'PY'
import json
msg = (
  "PE export visual QA required before finishing. You changed Proposal Engine "
  "proposal presentation/export files. Confirm neat/tidy/elegant output across "
  "Preview, PDF (no grey box-shadow slabs, NO blank/orphan-divider pages), "
  "DOCX, PPTX, Share link, and desktop/mobile viewing. "
  "See .cursor/rules/pe-proposal-export-visual-qa.mdc. "
  "If already verified, reply with the checklist marked done; otherwise finish the check now."
)
print(json.dumps({"followup_message": msg}))
PY
exit 0

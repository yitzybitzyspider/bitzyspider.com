#!/usr/bin/env bash
# Checks the setup wizard runs on a pasted secret BEFORE saving it anywhere (F-018, D-055).
# Hidden input hides mistakes: on 2026-11-10 a key pasted three times was saved to two places
# and every agent call failed. Sourced by setup-wizard.sh; tested by test_secret_checks.sh.
# Nothing here prints a secret.

# clean_secret VALUE: the value without surrounding space, line breaks or quotes.
clean_secret() {
  local v="$1"
  v="${v//$'\r'/}"; v="${v//$'\n'/}"; v="${v//$'\t'/}"
  v="${v#"${v%%[![:space:]]*}"}"; v="${v%"${v##*[![:space:]]}"}"
  v="${v#\"}"; v="${v%\"}"; v="${v#\'}"; v="${v%\'}"
  printf '%s' "$v"
}

# paste_count VALUE: how many times the same text was pasted in a row (1 when it was pasted once).
paste_count() {
  local v="$1" len=${#1} n unit rep i
  for n in 6 5 4 3 2; do
    (( len >= n * 8 && len % n == 0 )) || continue
    unit="${v:0:len/n}"; rep=""
    for ((i = 0; i < n; i++)); do rep+="$unit"; done
    if [[ "$rep" == "$v" ]]; then printf '%s' "$n"; return 0; fi
  done
  printf '1'
}

# one_copy VALUE: a single copy of a value that was pasted several times in a row.
one_copy() { local n; n=$(paste_count "$1"); printf '%s' "${1:0:${#1}/n}"; }

# secret_shape_problem KIND VALUE: prints why the value cannot be that kind of key; prints nothing when it looks right.
secret_shape_problem() {
  local kind="$1" v="$2" dots="${2//[^.]/}"
  [[ "$v" =~ [[:space:]] ]] && { printf 'it contains a space or line break'; return 0; }
  case "$kind" in
    supabase)
      [[ "$v" == sb_publishable_* ]] && { printf 'that is the publishable key; you want the secret one'; return 0; }
      [[ "$v" == sb_secret_* || ${#dots} -eq 2 ]] || printf 'it is neither an sb_secret_ key nor a service_role token' ;;
    anthropic) [[ "$v" == sk-ant-* ]] || printf 'an Anthropic key starts with sk-ant-' ;;
    github)    [[ "$v" == github_pat_* || "$v" == ghp_* ]] || printf 'a GitHub token starts with github_pat_ or ghp_' ;;
  esac
  return 0
}

# supabase_key_status URL KEY: the HTTP status of a real read with that key (200 means it works).
supabase_key_status() {
  curl -s -o /dev/null -w '%{http_code}' --max-time 20 "${1%/}/rest/v1/sources?select=name&limit=1" \
    -H "apikey: $2" -H "Authorization: Bearer $2" 2>/dev/null || printf '000'
}

# anthropic_key_status KEY: the HTTP status of listing models with that key (200 means it works; costs nothing).
anthropic_key_status() {
  curl -s -o /dev/null -w '%{http_code}' --max-time 20 "https://api.anthropic.com/v1/models?limit=1" \
    -H "x-api-key: $1" -H "anthropic-version: 2023-06-01" 2>/dev/null || printf '000'
}

# vet_secret KIND VALUE [URL]: cleans the value, keeps one copy, checks its shape, then proves it against
# the real service. On success sets VETTED to the value to save and returns 0. On failure sets VET_WHY
# (never containing the secret) and returns 1. VET_NOTE says when a repeated paste was repaired.
vet_secret() {
  local kind="$1" v n why code
  VETTED=""; VET_WHY=""; VET_NOTE=""
  v=$(clean_secret "$2")
  [[ -z "$v" ]] && { VET_WHY="nothing was pasted"; return 1; }
  n=$(paste_count "$v")
  if (( n > 1 )); then v=$(one_copy "$v"); VET_NOTE="it was pasted $n times in a row; kept one copy"; fi
  why=$(secret_shape_problem "$kind" "$v")
  [[ -n "$why" ]] && { VET_WHY="$why"; return 1; }
  case "$kind" in
    supabase)  code=$(supabase_key_status "$3" "$v") ;;
    anthropic) code=$(anthropic_key_status "$v") ;;
    *)         code=200 ;;
  esac
  if [[ "$code" != "200" ]]; then
    case "$code" in
      401|403) VET_WHY="the service rejected it (HTTP $code): it is not a working key for this project" ;;
      000)     VET_WHY="could not reach the service to test it (no network?)" ;;
      *)       VET_WHY="the service answered HTTP $code when testing it" ;;
    esac
    return 1
  fi
  VETTED="$v"; return 0
}

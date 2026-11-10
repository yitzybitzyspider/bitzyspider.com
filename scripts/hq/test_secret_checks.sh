#!/usr/bin/env bash
# Fault-injection test for secret-checks.sh. A fake curl stands in for Supabase and Anthropic:
# it answers 200 only for the one key it was told is real. No network, no real secret.
set -uo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
t="$(mktemp -d)"; trap 'rm -rf "$t"' EXIT
# Built in pieces so no secret-shaped string is ever committed.
SB="sb_sec""ret_"; AN="sk-a""nt-"; GH="github_p""at_"
good_sb="${SB}abcdefghijklmnopqrstuvwxyz01234"; good_an="${AN}api03-abcdefghijklmnop"
printf '%s\n%s\n' "$good_sb" "$good_an" > "$t/valid"
cat > "$t/curl" <<FAKE
#!/usr/bin/env bash
# Finds the key in the headers and answers like the real service would.
key=""; url=""
while [ \$# -gt 0 ]; do
  case "\$1" in
    -H) case "\$2" in apikey:*|x-api-key:*) key="\${2#*: }";; esac; shift ;;
    http*) url="\$1" ;;
  esac; shift
done
echo "\$url" >> "$t/urls"
[ -f "$t/down" ] && exit 7
if grep -qxF "\$key" "$t/valid"; then printf 200; else printf 401; fi
FAKE
chmod +x "$t/curl"; PATH="$t:$PATH"
# shellcheck source=/dev/null
. "$here/secret-checks.sh"
fail=0
ok() { if [ "$2" = "$3" ]; then echo "pass $1"; else echo "FAIL $1 (got '$2', want '$3')"; fail=1; fi; }

ok "one paste counts as one"            "$(paste_count "$good_sb")" 1
ok "the real break: pasted three times" "$(paste_count "$good_sb$good_sb$good_sb")" 3
ok "pasted twice"                       "$(paste_count "$good_sb$good_sb")" 2
ok "pasted six times"                   "$(paste_count "$good_sb$good_sb$good_sb$good_sb$good_sb$good_sb")" 6
ok "a short repeating value is left alone" "$(paste_count "abab")" 1
ok "two different keys are not a repeat"   "$(paste_count "${good_sb}${SB}zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz")" 1
ok "one_copy returns the single key"       "$(one_copy "$good_sb$good_sb$good_sb")" "$good_sb"
ok "one_copy leaves a single key alone"    "$(one_copy "$good_sb")" "$good_sb"
ok "clean strips spaces, line breaks and quotes" "$(clean_secret "  \"$good_sb\"$(printf '\r\n') ")" "$good_sb"
ok "shape: secret key accepted"      "$(secret_shape_problem supabase "$good_sb")" ""
ok "shape: legacy token accepted"    "$(secret_shape_problem supabase "aaa.bbb.ccc")" ""
ok "shape: publishable key refused"  "$(secret_shape_problem supabase "sb_publishable_abc")" "that is the publishable key; you want the secret one"
ok "shape: junk refused"             "$(secret_shape_problem supabase "hunter2")" "it is neither an sb_secret_ key nor a service_role token"
ok "shape: anthropic prefix required" "$(secret_shape_problem anthropic "$good_sb")" "an Anthropic key starts with sk-ant-"
ok "shape: inner space refused"      "$(secret_shape_problem anthropic "${AN}abc def")" "it contains a space or line break"
ok "shape: github token accepted"    "$(secret_shape_problem github "${GH}abc")" ""

vet() { vet_secret "$@"; echo "$?|$VETTED|$VET_WHY|$VET_NOTE"; }
ok "a good key passes and is returned unchanged" "$(vet supabase "$good_sb" https://p.supabase.co)" "0|$good_sb||"
ok "a tripled key is repaired, tested and saved once" "$(vet supabase "$good_sb$good_sb$good_sb" https://p.supabase.co)" "0|$good_sb||it was pasted 3 times in a row; kept one copy"
ok "a quoted key with a line break is cleaned"   "$(vet supabase "'$good_sb'$(printf '\n')" https://p.supabase.co)" "0|$good_sb||"
ok "a well-shaped key the project rejects is not saved" "$(vet supabase "${SB}wrongwrongwrongwrongwrongwrong01" https://p.supabase.co)" "1||the service rejected it (HTTP 401): it is not a working key for this project|"
ok "the publishable key is refused before any call" "$(: > "$t/urls"; vet supabase sb_publishable_abc https://p.supabase.co; wc -l < "$t/urls" | tr -d ' ')" "1||that is the publishable key; you want the secret one|
0"
ok "nothing pasted is refused"       "$(vet supabase "   " https://p.supabase.co)" "1||nothing was pasted|"
ok "a good anthropic key passes"     "$(vet anthropic "$good_an")" "0|$good_an||"
ok "a doubled anthropic key is repaired" "$(vet anthropic "$good_an$good_an")" "0|$good_an||it was pasted 2 times in a row; kept one copy"
ok "a revoked anthropic key is not saved" "$(vet anthropic "${AN}api03-revokedrevoked")" "1||the service rejected it (HTTP 401): it is not a working key for this project|"
ok "a supabase key pasted as the anthropic key is refused" "$(vet anthropic "$good_sb")" "1||an Anthropic key starts with sk-ant-|"
: > "$t/urls"; vet supabase "$good_sb" https://p.supabase.co/ >/dev/null; vet anthropic "$good_an" >/dev/null
ok "the supabase test is a real read on the project" "$(sed -n 1p "$t/urls")" "https://p.supabase.co/rest/v1/sources?select=name&limit=1"
ok "the anthropic test lists models and spends nothing" "$(sed -n 2p "$t/urls")" "https://api.anthropic.com/v1/models?limit=1"
touch "$t/down"
ok "no network is reported as such, and nothing is saved" "$(vet supabase "$good_sb" https://p.supabase.co)" "1||could not reach the service to test it (no network?)|"
rm "$t/down"
out="$(vet supabase "${SB}wrongwrongwrongwrongwrongwrong01" https://p.supabase.co; vet anthropic "x y"; vet supabase "$good_sb$good_sb" https://p.supabase.co)"
ok "no failure message or note ever contains the secret" "$(printf '%s' "$out" | cut -d'|' -f3,4 | grep -c "${SB}\|${AN}")" "0"
# The real wizard function, fed pastes on standard input (the library half of the wizard, above its stages).
drive() { # stdin: pastes, one per line. prints rc|saved value|how many times it refused
  ( set +e; eval "$(awk '/^# STAGES:/{exit} {print}' "$here/setup-wizard.sh")"; set +eu
    out="$(ask_vetted "$@" 2>&1; printf '\n#rc=%s|%s' "$?" "$VETTED")"
    printf '%s|%s' "$(printf '%s' "$out" | sed -n 's/^#rc=//p')" "$(printf '%s' "$out" | grep -c 'Not saved')" )
}
bad_sb="${SB}wrongwrongwrongwrongwrongwrong01"
ok "wizard: a tripled paste is repaired, tested and accepted" "$(printf '%s\n' "$good_sb$good_sb$good_sb" | drive supabase K "Paste:" https://p.supabase.co)" "0|$good_sb|0"
ok "wizard: a tripled paste is announced" "$(printf '%s\n' "$good_sb$good_sb$good_sb" | ( set +e; eval "$(awk '/^# STAGES:/{exit} {print}' "$here/setup-wizard.sh")"; set +eu; ask_vetted supabase K "Paste:" https://p.supabase.co 2>&1 | grep -c 'pasted 3 times in a row; kept one copy' ))" "1"
ok "wizard: a wrong key then the right one is accepted on the second try" "$(printf '%s\n%s\n' "$bad_sb" "$good_sb" | drive supabase K "Paste:" https://p.supabase.co)" "0|$good_sb|1"
ok "wizard: three wrong pastes save nothing" "$(printf '%s\nsb_publishable_x\njunk\n' "$bad_sb" | drive supabase K "Paste:" https://p.supabase.co)" "1||3"
ok "wizard: an empty answer skips without saving" "$(printf '\n' | drive supabase K "Paste:" https://p.supabase.co)" "1||0"
ok "wizard: the anthropic key is tested the same way" "$(printf '%s\n' "$good_an$good_an" | drive anthropic K "Paste:")" "0|$good_an|0"
ok "wizard: the prompt never echoes what was pasted" "$(printf '%s\n' "$bad_sb" "$bad_sb" "$bad_sb" | ( set +e; eval "$(awk '/^# STAGES:/{exit} {print}' "$here/setup-wizard.sh")"; set +eu; ask_vetted supabase K "Paste:" https://p.supabase.co 2>&1 | grep -c "$SB" ))" "0"
# The wizard must use the checks before it saves, for both keys.
w="$here/setup-wizard.sh"
ok "the wizard sources the checks" "$(grep -c 'secret-checks.sh' "$w")" "1"
ok "the wizard vets the service key before saving it" "$(awk '/ask_vetted supabase/{v=NR} /set_secret SUPABASE_SERVICE_KEY/{s=NR} END{print (v && s && v < s) ? "yes" : "no"}' "$w")" "yes"
ok "the wizard vets the anthropic key before saving it" "$(awk '/ask_vetted anthropic/{v=NR} /set_secret ANTHROPIC_API_KEY/{s=NR} END{print (v && s && v < s) ? "yes" : "no"}' "$w")" "yes"
ok "the wizard saves only the vetted value" "$(grep -c 'set_secret SUPABASE_SERVICE_KEY "\$VETTED"\|set_secret ANTHROPIC_API_KEY "\$VETTED"\|write_env SUPABASE_SERVICE_KEY "\$VETTED"' "$w")" "3"
[ "$fail" -eq 0 ] && echo "all pass"
exit "$fail"

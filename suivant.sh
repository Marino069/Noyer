#!/usr/bin/env bash
# Noyer · une seule commande pour avancer :
#   1. fusionne les PR dont les vérifications sont vertes
#   2. demande à Claude de réparer les PR en échec (une seule fois par PR)
#   3. lance le ticket front suivant si Claude ne travaille sur rien
# Usage : ./suivant.sh
set -uo pipefail
REPO="Marino069/Noyer"
MOI=$(gh api user --jq .login)

checks_en_echec() {
  gh pr checks "$1" --repo "$REPO" --json name,bucket \
    --jq '[.[] | select(.bucket=="fail") | .name] | join(", ")' 2>/dev/null
}

# $1 = numéro de PR, $2 = marqueur (auto-ci ou auto-conflit)
deja_signalee() {
  gh pr view "$1" --repo "$REPO" --json comments,headRefOid \
    --jq "[.comments[] | select(.author.login==\"$MOI\" and (.body | contains(\"[$2 \" + .headRefOid[0:7])))] | length" 2>/dev/null
}

echo "=== 1. Pull requests ==="
rien=1
for pr in $(gh pr list --repo "$REPO" --state open --json number,isDraft --jq '.[] | select(.isDraft==false) | .number' | sort -n); do
  rien=0
  titre=$(gh pr view "$pr" --repo "$REPO" --json title --jq .title)
  gh pr checks "$pr" --repo "$REPO" > /dev/null 2>&1
  etat=$?
  case "$etat" in
    0)
      if gh pr merge "$pr" --repo "$REPO" --squash --delete-branch > /dev/null 2>&1; then
        echo "  ✅ #$pr fusionnée : $titre"
      else
        echo "  ⚠️  #$pr verte mais impossible à fusionner (conflit) : $titre"
        if [ "$(deja_signalee "$pr" auto-conflit)" = "0" ]; then
          sha=$(gh pr view "$pr" --repo "$REPO" --json headRefOid --jq '.headRefOid[0:7]')
          gh pr comment "$pr" --repo "$REPO" --body "[auto-conflit $sha] @claude cette PR a un conflit avec master. Mets la branche à jour avec master, résous le conflit et pousse sur cette branche. N'ouvre pas de nouvelle PR." > /dev/null
          echo "     → demandé à Claude de résoudre le conflit"
        fi
      fi ;;
    8)
      echo "  ⏳ #$pr en cours de vérification : $titre"
      echo "     (si ça reste bloqué, ouvre-la sur GitHub et clique « Approve and run »)" ;;
    *)
      echecs=$(checks_en_echec "$pr")
      if [ -z "$echecs" ]; then
        echo "  ⏳ #$pr pas encore vérifiée : $titre"
        continue
      fi
      if ! echo "$echecs" | grep -qE '(^|, )ci(,|$)'; then
        echo "  🔧 #$pr : un agent est en panne ($echecs), ce n'est pas le code. Signale-le à Claude (chat) : $titre"
        continue
      fi
      echecs="ci"
      echo "  ❌ #$pr : la CI échoue : $titre"
      if [ "$(deja_signalee "$pr" auto-ci)" = "0" ]; then
        sha=$(gh pr view "$pr" --repo "$REPO" --json headRefOid --jq '.headRefOid[0:7]')
        gh pr comment "$pr" --repo "$REPO" --body "[auto-ci $sha] @claude les vérifications suivantes échouent sur cette PR : $echecs. Lis les logs des jobs en échec, trouve la cause et corrige-la sur la branche de cette PR (n'ouvre pas de nouvelle PR). S'il s'agit d'un test qui révèle un vrai bug dans le code du site, ne change pas le test : explique le bug en commentaire." > /dev/null
        echo "     → demandé à Claude de corriger"
      else
        echo "     → Claude a déjà été prévenu, attends sa correction"
      fi ;;
  esac
done
[ "$rien" -eq 1 ] && echo "  Aucune PR ouverte."

echo
echo "=== 2. Ticket front suivant ==="
en_cours=$(gh issue list --repo "$REPO" --state open --label frontend --label claude --json number,title --jq '.[] | select(.title | test("^\\[E[0-9]-[0-9]{2}\\]")) | "#\(.number) \(.title)"')
if [ -n "$en_cours" ]; then
  echo "  🤖 Claude travaille sur : $en_cours"
  echo "     Relance ./suivant.sh plus tard."
  exit 0
fi

candidats=$(gh issue list --repo "$REPO" --state open --label frontend --limit 200 \
  --json number,title,labels \
  --jq '[.[] | select(.title | test("^\\[E[0-9]-[0-9]{2}\\]"))
             | select([.labels[].name] | index("bloqué-décision") | not)]
        | sort_by(.title)[] | .number')

for n in $candidats; do
  corps=$(gh issue view "$n" --repo "$REPO" --json body --jq .body)
  pret=1
  for dep in $(echo "$corps" | grep -oE '\- \[[ x]\] #[0-9]+' | grep -oE '[0-9]+$'); do
    if [ "$(gh issue view "$dep" --repo "$REPO" --json state --jq .state)" != "CLOSED" ]; then
      pret=0; break
    fi
  done
  if [ "$pret" -eq 1 ]; then
    gh issue edit "$n" --repo "$REPO" --add-label claude > /dev/null
    echo "  🚀 Lancé : #$n $(gh issue view "$n" --repo "$REPO" --json title --jq .title)"
    exit 0
  fi
done
echo "  🎉 Aucun ticket front prêt : tout est fait, ou il attend une dépendance."

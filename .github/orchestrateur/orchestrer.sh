#!/usr/bin/env bash
# Chef d'orchestre Noyer. Tourne dans GitHub Actions avec le jeton NOYER_BOT_TOKEN,
# donc chaque action compte comme faite par toi et déclenche les autres agents.
set -uo pipefail
REPO="${REPO:?}"
LIMITE_JOUR="${LIMITE_JOUR:-8}"
LECTURE_TOKEN="${LECTURE_TOKEN:-$GH_TOKEN}" # jeton Actions : seul capable de lire les vérifications
MOI=$(gh api user --jq .login)
AUJOURDHUI=$(TZ=Europe/Zurich date +%F)
REGEX_TICKET='^\\[(E[0-9]-[0-9]{2}|B[0-9]-[0-9]{2}|Bug)\\]'

log() { echo "$*"; }

# --- 0. Pause ----------------------------------------------------------------
if [ "$(gh issue list --repo "$REPO" --state open --label pause --json number --jq length)" != "0" ]; then
  log "⏸️  Une issue porte le label « pause » : rien à faire."
  exit 0
fi

# --- 1. Approuver les exécutions bloquées en « Action required » -------------
for run in $(gh run list --repo "$REPO" --status action_required --limit 30 --json databaseId --jq '.[].databaseId'); do
  gh api -X POST "repos/$REPO/actions/runs/$run/approve" > /dev/null 2>&1 \
    && log "👍 Exécution $run approuvée"
done

cote_issue() { # frontend | backend | vide
  gh issue view "$1" --repo "$REPO" --json labels \
    --jq '[.labels[].name] | if index("frontend") then "frontend" elif index("backend") then "backend" else "" end'
}

nb_marqueurs() { # $1 = numéro (PR ou issue), $2 = texte du marqueur
  gh api "repos/$REPO/issues/$1/comments" --paginate \
    --jq "[.[] | select(.user.login==\"$MOI\" and (.body | contains(\"$2\")))] | length" 2>/dev/null \
    | awk '{s+=$1} END {print s+0}'
}

checks_en_echec() {
  GH_TOKEN="$LECTURE_TOKEN" gh pr checks "$1" --repo "$REPO" --json name,bucket \
    --jq '[.[] | select(.bucket=="fail") | .name] | join(",")' 2>/dev/null
}

# --- 2. Pull requests --------------------------------------------------------
log "=== Pull requests ==="
for pr in $(gh pr list --repo "$REPO" --state open --json number,isDraft --jq '.[] | select(.isDraft==false) | .number' | sort -n); do
  info=$(gh pr view "$pr" --repo "$REPO" --json title,headRefName,headRefOid,mergeable,author,closingIssuesReferences)
  titre=$(echo "$info" | jq -r .title)
  branche=$(echo "$info" | jq -r .headRefName)
  sha=$(echo "$info" | jq -r '.headRefOid[0:7]')
  mergeable=$(echo "$info" | jq -r .mergeable)
  issues_liees=$(echo "$info" | jq -r '[.closingIssuesReferences[].number] | join(" ")')

  GH_TOKEN="$LECTURE_TOKEN" gh pr checks "$pr" --repo "$REPO" > /dev/null 2>&1
  etat=$?
  echecs=$(checks_en_echec "$pr")
  # Seuls les échecs de CI (front ou back, job « ci ») bloquent. Un agent en panne ne bloque pas.
  ci_ko=0
  echo ",$echecs," | grep -q ',ci,' && ci_ko=1

  if [ "$etat" -eq 8 ]; then
    log "⏳ #$pr en cours de vérification : $titre"
    continue
  fi
  if [ -z "$(GH_TOKEN="$LECTURE_TOKEN" gh pr checks "$pr" --repo "$REPO" --json name --jq '.[].name' 2>/dev/null)" ]; then
    log "⏳ #$pr pas encore vérifiée : $titre"
    continue
  fi

  probleme=""
  if [ "$mergeable" = "CONFLICTING" ]; then
    probleme="conflit"
  elif [ "$ci_ko" -eq 1 ]; then
    probleme="ci"
  fi

  if [ -z "$probleme" ]; then
    if gh pr merge "$pr" --repo "$REPO" --squash --delete-branch > /dev/null 2>&1; then
      log "✅ #$pr fusionnée : $titre"
    else
      log "⚠️  #$pr verte mais fusion refusée (on réessaiera) : $titre"
    fi
    continue
  fi

  # Réparation : une demande par version du code, 3 demandes au maximum.
  demandes=$(nb_marqueurs "$pr" "[auto-reparation")
  if [ "$demandes" -ge 3 ]; then
    if [[ "$branche" == claude/* ]]; then
      gh pr close "$pr" --repo "$REPO" --delete-branch \
        --comment "Fermée par le chef d'orchestre après 3 réparations sans succès. Le ticket sera relancé depuis master." > /dev/null
      for i in $issues_liees; do
        gh issue edit "$i" --repo "$REPO" --remove-label claude > /dev/null 2>&1
      done
      log "♻️  #$pr fermée après 3 échecs, ticket(s) $issues_liees à relancer : $titre"
    else
      log "🛑 #$pr toujours en échec après 3 réparations (branche non gérée par Claude) : $titre"
    fi
    continue
  fi
  # Redemande si rien n'a bougé depuis plus d'une heure (Claude a abandonné).
  dernier=$(gh api "repos/$REPO/issues/$pr/comments" --paginate \
    --jq "[.[] | select(.user.login==\"$MOI\" and (.body | contains(\"[auto-reparation $sha\")))] | last | .created_at // empty" 2>/dev/null | tail -1)
  age_rep=9999
  [ -n "$dernier" ] && age_rep=$(( ( $(date +%s) - $(date -d "$dernier" +%s) ) / 60 ))
  if [ -z "$dernier" ] || [ "$age_rep" -ge 60 ]; then
    if [ "$probleme" = "conflit" ]; then
      consigne="cette PR a un conflit avec master. Mets la branche à jour avec master, résous le conflit"
    else
      consigne="la CI échoue sur cette PR. Lis les logs du job « ci » en échec, trouve la cause et corrige-la"
    fi
    gh pr comment "$pr" --repo "$REPO" --body "[auto-reparation $sha] @claude $consigne, puis pousse sur la branche de cette PR (n'ouvre pas de nouvelle PR). Si un test révèle un vrai bug du code, corrige le code, pas le test." > /dev/null
    log "🔧 #$pr ($probleme) : réparation demandée à Claude ($((demandes + 1))/3)"
  else
    log "🔧 #$pr ($probleme) : réparation en cours"
  fi
done

# --- 3. Tickets --------------------------------------------------------------
log ""
log "=== Tickets ==="

# Lancements du jour = labels « claude » posés aujourd'hui (heure de Zurich).
lances=$(for page in 1 2 3; do
    gh api "repos/$REPO/issues/events?per_page=100&page=$page" \
      --jq ".[] | select(.event==\"labeled\" and .label.name==\"claude\") | .created_at" 2>/dev/null
  done | while read -r d; do TZ=Europe/Zurich date -d "$d" +%F; done | grep -c "^$AUJOURDHUI$")
log "Tickets lancés aujourd'hui : $lances / $LIMITE_JOUR"

pr_ouverte_pour() { # $1 = numéro d'issue → numéro de PR ouverte ou vide
  gh pr list --repo "$REPO" --state open --json number,closingIssuesReferences \
    --jq ".[] | select([.closingIssuesReferences[].number] | index($1)) | .number" | head -1
}

for cote in frontend backend; do
  en_cours=$(gh issue list --repo "$REPO" --state open --label "$cote" --label claude --limit 50 \
    --json number,title --jq ".[] | select(.title | test(\"$REGEX_TICKET\")) | .number" | head -1)

  if [ -n "$en_cours" ]; then
    if [ -n "$(pr_ouverte_pour "$en_cours")" ]; then
      log "🤖 $cote : #$en_cours en cours, sa PR attend vérification ou fusion"
      continue
    fi
    # Pas de PR : soit Claude travaille encore, soit son exécution a échoué.
    pose=$(gh api "repos/$REPO/issues/$en_cours/events" --paginate \
      --jq '[.[] | select(.event=="labeled" and .label.name=="claude")] | last | .created_at' 2>/dev/null | tail -1)
    age_min=$(( ( $(date +%s) - $(date -d "${pose:-now}" +%s) ) / 60 ))
    if [ "$age_min" -lt 90 ]; then
      log "🤖 $cote : Claude travaille sur #$en_cours (depuis $age_min min)"
      continue
    fi
    tentatives=$(nb_marqueurs "$en_cours" "[auto-relance]")
    if [ "$tentatives" -ge 2 ]; then
      gh issue edit "$en_cours" --repo "$REPO" --remove-label claude --add-label bloqué-agent > /dev/null
      gh issue comment "$en_cours" --repo "$REPO" --body "Le chef d'orchestre met ce ticket de côté (bloqué-agent) : 3 tentatives sans PR. Il a besoin d'un regard humain." > /dev/null
      log "🛑 $cote : #$en_cours mis de côté après 3 tentatives"
    else
      gh issue comment "$en_cours" --repo "$REPO" --body "[auto-relance] Aucune PR après $age_min minutes : ticket relancé." > /dev/null
      gh issue edit "$en_cours" --repo "$REPO" --remove-label claude > /dev/null
      sleep 2
      gh issue edit "$en_cours" --repo "$REPO" --add-label claude > /dev/null
      log "♻️  $cote : #$en_cours relancé (tentative $((tentatives + 2)))"
    fi
    continue
  fi

  if [ "$lances" -ge "$LIMITE_JOUR" ]; then
    log "🧮 $cote : limite du jour atteinte, reprise demain"
    continue
  fi

  # Les bugs passent en premier, puis les tickets dans l'ordre (E0-01, E0-02…).
  candidats=$(gh issue list --repo "$REPO" --state open --label "$cote" --limit 200 --json number,title,labels \
    --jq "[.[] | select(.title | test(\"$REGEX_TICKET\"))
              | select([.labels[].name] | (index(\"bloqué-décision\") or index(\"bloqué-agent\") or index(\"pause\")) | not)]
          | sort_by((if (.title | startswith(\"[Bug]\")) then \"0\" else \"1\" end) + .title)[] | .number")
  lance=""
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
      lance="$n"
      lances=$((lances + 1))
      log "🚀 $cote : lancé #$n $(gh issue view "$n" --repo "$REPO" --json title --jq .title)"
      break
    fi
  done
  if [ -z "$lance" ]; then log "🎉 $cote : aucun ticket prêt (tout est fait, bloqué ou en attente d'une dépendance)"; fi
done
exit 0

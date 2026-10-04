# Noyer · Tickets GitHub (frontend + backend)

- `tickets/frontend/` : 8 epics + 41 tickets (E0 à E7), mis à jour avec les décisions récentes (API Django, Stripe Checkout)
- `tickets/backend/` : 8 epics + 37 tickets (B0 à B7), version Django
- `push_issues.py` : envoie le tout dans GitHub Issues et le Project

## Lancer

```bash
gh auth status                      # vérifier la connexion
python3 push_issues.py --repo Marino069/Noyer --project 1 --dry-run
python3 push_issues.py --repo Marino069/Noyer --project 1
```

`--only frontend` ou `--only backend` pour n'envoyer qu'une partie.

## Ce que fait le script

- Un ticket déjà présent sur GitHub (reconnu à son identifiant dans le titre, ex. `[E0-01]`) est **mis à jour** : titre, description, labels.
- Un ticket absent est **créé**.
- Chaque ticket est rattaché à son epic (sub-issue) et ajouté au Project.
- Les dépendances deviennent des liens `#12`.

Il peut être relancé sans risque : aucun doublon n'est créé.

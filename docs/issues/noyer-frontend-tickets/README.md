# Noyer · Backlog frontend

8 epics et 41 tickets générés depuis le brief de marque, prêts à être poussés dans GitHub Issues + Project.

## Contenu
- `tickets/` : un fichier Markdown par epic et par ticket (modifiable avant l'envoi)
- `create_issues.py` : crée labels, epics, issues, liens sub-issues, et ajoute tout au Project
- `.github/ISSUE_TEMPLATE/ticket-frontend.yml` : formulaire pour les futurs tickets (à copier dans le repo)

## Mise en route
1. Installer la CLI GitHub puis s'authentifier :
   `gh auth login` puis `gh auth refresh -s project`
2. Créer le Project (une seule fois) et noter son numéro :
   `gh project create --owner <owner> --title "Noyer · Frontend"`
3. Relire et ajuster les fichiers de `tickets/`
4. Simuler : `python3 create_issues.py --repo <owner>/<repo> --project <n> --dry-run`
5. Créer : `python3 create_issues.py --repo <owner>/<repo> --project <n>`

Le script est relançable : `.created.json` mémorise ce qui existe déjà. Pour ajouter un ticket plus tard, créer un nouveau fichier dans `tickets/` et relancer.

## Format d'un ticket
```
---
id: E1-08
type: ticket
epic: E1
title: [E1-08] Titre du ticket
labels: frontend,size:S,prio:P1,design-system
depends: E1-01, E0-02
---
## Contexte
...
```
Les dépendances doivent pointer vers des ids qui précèdent dans l'ordre alphabétique.

## Vues conseillées dans le Project
- **Board** par Status (Todo / In progress / Review / Done)
- **Table** groupée par Parent issue (= epic), avec la colonne Sub-issues progress
- **Roadmap** filtrée sur `label:prio:P0` pour le périmètre de lancement
- Filtre `label:bloqué-décision` pour suivre ce qui attend les décisions du brief §08

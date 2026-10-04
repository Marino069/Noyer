#!/usr/bin/env python3
"""
Envoie les tickets frontend et backend de Noyer dans GitHub Issues + Project.

- Un ticket qui existe déjà sur GitHub (même identifiant dans le titre,
  ex. "[E0-01]") est MIS À JOUR : titre, description et labels.
- Un ticket absent est CRÉÉ.
- Chaque ticket est rattaché à son epic (sub-issue) et ajouté au Project.

Relançable autant de fois que nécessaire, sans créer de doublons.

Prérequis :
    gh auth login
    gh auth refresh -s project

Usage :
    python3 push_issues.py --repo Marino069/Noyer --project 1 --dry-run
    python3 push_issues.py --repo Marino069/Noyer --project 1
    python3 push_issues.py --repo Marino069/Noyer --project 1 --only backend
"""
import argparse, json, os, re, subprocess, sys, tempfile
from pathlib import Path

ROOT = Path(__file__).parent

LABELS = {
    "frontend": ("1d76db", "Travail frontend"),
    "backend": ("0e8a16", "Travail backend"),
    "epic": ("29251F", "Epic regroupant des sub-issues"),
    "user-story": ("5319e7", "Besoin exprimé du point de vue d'un utilisateur"),
    "tâche-technique": ("bfd4f2", "Travail technique sans valeur directe pour l'utilisateur"),
    "size:S": ("ededed", "Moins d'une journée"),
    "size:M": ("c5c5c5", "1 à 3 jours"),
    "size:L": ("8a8a8a", "Plus de 3 jours"),
    "prio:P0": ("b60205", "Indispensable au lancement"),
    "prio:P1": ("d93f0b", "Important"),
    "prio:P2": ("fbca04", "Souhaitable"),
    "setup": ("604735", "Socle technique"),
    "database": ("6f42c1", "Schéma ou accès base de données"),
    "design-system": ("B08D57", "Composants de la charte"),
    "layout": ("DED3C2", "Structure de page"),
    "homepage": ("F5F1E8", "Sections de la homepage"),
    "catalogue": ("3A3028", "Catalogue"),
    "inventaire": ("c9a46a", "Inventaire"),
    "panier": ("e4d9c7", "Panier"),
    "commande": ("c5def5", "Commande"),
    "paiement": ("d4c5f9", "Paiement"),
    "checkout": ("a371f7", "Panier et paiement côté front"),
    "admin": ("f9d0c4", "Back-office de l'atelier"),
    "contenu": ("2da44e", "Pages éditoriales"),
    "conformité": ("006b75", "Légal, nLPD, qualité"),
    "securite": ("0052cc", "Sécurité"),
    "a11y": ("0969da", "Accessibilité"),
    "seo": ("c2e0c6", "Référencement"),
    "perf": ("bfdadc", "Performance"),
    "api": ("d8b4fe", "Consomme l'API du back"),
    "bloqué-décision": ("e99695", "Attend une décision ouverte"),
}
KEY_RE = re.compile(r"^\[(?:Epic )?([EB]\d(?:-\d\d)?)\]")


def run(cmd, check=True):
    res = subprocess.run(cmd, capture_output=True, text=True)
    if check and res.returncode != 0:
        sys.exit(f"Erreur : {' '.join(cmd)}\n{res.stderr}")
    return res


def parse(path):
    text = path.read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", text, re.S)
    meta = {}
    for line in m.group(1).splitlines():
        k, _, v = line.partition(":")
        meta[k.strip()] = v.strip()
    meta["labels"] = [l.strip() for l in meta.get("labels", "").split(",") if l.strip()]
    meta["depends"] = [d.strip() for d in meta.get("depends", "").split(",") if d.strip()]
    meta["body"] = m.group(2).strip()
    return meta


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True)
    ap.add_argument("--project", type=int)
    ap.add_argument("--project-owner")
    ap.add_argument("--only", choices=["frontend", "backend"])
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    a.repo = re.sub(r"^(https?://)?(www\.)?github\.com/", "", a.repo.strip()).removesuffix(".git").strip("/")
    if a.repo.count("/") != 1:
        sys.exit("--repo doit être au format owner/repo")
    owner = a.project_owner or a.repo.split("/")[0]
    dry = a.dry_run

    run(["gh", "auth", "status"])

    # Issues déjà présentes sur GitHub, indexées par identifiant (E0-01, B2, ...)
    res = run(["gh", "issue", "list", "--repo", a.repo, "--state", "all", "--limit", "1000",
               "--json", "number,title,url"])
    existing = {}
    for it in json.loads(res.stdout):
        m = KEY_RE.match(it["title"])
        if m:
            existing[m.group(1)] = it
    print(f"→ {len(existing)} tickets Noyer déjà présents sur GitHub")

    sides = [a.only] if a.only else ["frontend", "backend"]
    items = []
    for side in sides:
        files = sorted((ROOT / "tickets" / side).glob("*.md"))
        group = [parse(p) for p in files]
        group.sort(key=lambda m: (m["id"][:2], m["type"] != "epic", m["id"]))
        items += group

    print("→ Labels")
    for name, (color, desc) in LABELS.items():
        if dry:
            continue
        run(["gh", "label", "create", name, "--repo", a.repo, "--color", color,
             "--description", desc, "--force"])

    numbers = {k: v["number"] for k, v in existing.items()}
    urls = {k: v["url"] for k, v in existing.items()}
    created = updated = 0

    print("→ Issues")
    for it in items:
        body = it["body"]
        if it["depends"]:
            deps = "\n".join(f"- [ ] #{numbers[d]}" if d in numbers else f"- [ ] {d}" for d in it["depends"])
            body += f"\n\n## Dépendances\n{deps}"
        with tempfile.NamedTemporaryFile("w", suffix=".md", delete=False, encoding="utf-8") as tmp:
            tmp.write(body)
        key = it["id"]
        try:
            if key in existing:
                updated += 1
                num = existing[key]["number"]
                print(f"  ~ #{num} {it['title']}")
                if not dry:
                    cmd = ["gh", "issue", "edit", str(num), "--repo", a.repo,
                           "--title", it["title"], "--body-file", tmp.name]
                    for l in it["labels"]:
                        cmd += ["--add-label", l]
                    run(cmd)
            else:
                created += 1
                print(f"  + {it['title']}")
                if dry:
                    numbers[key] = f"<{key}>"
                    continue
                cmd = ["gh", "issue", "create", "--repo", a.repo, "--title", it["title"], "--body-file", tmp.name]
                for l in it["labels"]:
                    cmd += ["--label", l]
                url = run(cmd).stdout.strip()
                num = int(url.rstrip("/").split("/")[-1])
                numbers[key], urls[key] = num, url
        finally:
            os.unlink(tmp.name)
        if dry:
            continue

        # Rattacher à l'epic (ignoré si c'est déjà fait)
        if it["type"] == "ticket" and it.get("epic") in numbers:
            db_id = run(["gh", "api", f"repos/{a.repo}/issues/{numbers[key]}", "--jq", ".id"]).stdout.strip()
            run(["gh", "api", "-X", "POST", f"repos/{a.repo}/issues/{numbers[it['epic']]}/sub_issues",
                 "-F", f"sub_issue_id={db_id}", "--silent"], check=False)
        # Ajouter au Project (sans effet s'il y est déjà)
        if a.project:
            run(["gh", "project", "item-add", str(a.project), "--owner", owner, "--url", urls[key]], check=False)

    print(f"\n{created} créés, {updated} mis à jour." + (" (dry-run : rien n'a été modifié)" if dry else ""))


if __name__ == "__main__":
    main()

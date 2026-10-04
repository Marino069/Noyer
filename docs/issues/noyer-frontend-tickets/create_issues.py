#!/usr/bin/env python3
"""
Crée les epics et tickets frontend Noyer dans GitHub Issues, les relie en
sub-issues et les ajoute à un GitHub Project (v2).

Prérequis : GitHub CLI (`gh`) authentifié avec le scope project :
    gh auth login
    gh auth refresh -s project

Usage :
    python3 create_issues.py --repo owner/noyer-web --project 1 --dry-run
    python3 create_issues.py --repo owner/noyer-web --project 1

Relançable sans risque : les tickets déjà créés sont mémorisés dans
.created.json et ne sont pas recréés.
"""
import argparse, json, os, re, subprocess, sys, tempfile
from pathlib import Path

ROOT = Path(__file__).parent
TICKETS_DIR = ROOT / "tickets"
STATE_FILE = ROOT / ".created.json"

LABELS = {
    "frontend": ("1d76db", "Travail frontend"),
    "epic": ("29251F", "Epic regroupant des sub-issues"),
    "size:S": ("ededed", "Moins d'une journée"),
    "size:M": ("c5c5c5", "1 à 3 jours"),
    "size:L": ("8a8a8a", "Plus de 3 jours, à découper si possible"),
    "prio:P0": ("b60205", "Indispensable au lancement"),
    "prio:P1": ("d93f0b", "Important"),
    "prio:P2": ("fbca04", "Souhaitable"),
    "setup": ("604735", "Socle technique"),
    "design-system": ("B08D57", "Composants de la charte"),
    "layout": ("DED3C2", "Structure de page"),
    "homepage": ("F5F1E8", "Sections de la homepage"),
    "catalogue": ("3A3028", "Listing et fiches produit"),
    "checkout": ("5319e7", "Panier et paiement"),
    "contenu": ("0e8a16", "Pages éditoriales et CMS"),
    "conformité": ("006b75", "Légal, nLPD, qualité"),
    "a11y": ("0052cc", "Accessibilité"),
    "seo": ("c2e0c6", "Référencement"),
    "perf": ("bfdadc", "Performance"),
    "api": ("d4c5f9", "Consomme la BFF"),
    "bloqué-décision": ("e99695", "Attend une décision ouverte du brief §08"),
}


def run(cmd, dry, capture=True):
    if dry:
        print("  $", " ".join(cmd))
        return ""
    res = subprocess.run(cmd, capture_output=capture, text=True)
    if res.returncode != 0:
        sys.exit(f"Erreur : {' '.join(cmd)}\n{res.stderr}")
    return res.stdout.strip()


def parse(path):
    text = path.read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", text, re.S)
    if not m:
        sys.exit(f"Frontmatter invalide : {path}")
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
    ap.add_argument("--repo", required=True, help="owner/nom-du-repo")
    ap.add_argument("--project", type=int, help="Numéro du GitHub Project (v2)")
    ap.add_argument("--project-owner", help="Propriétaire du Project (défaut : owner du repo)")
    ap.add_argument("--dry-run", action="store_true", help="Affiche les commandes sans rien créer")
    a = ap.parse_args()
    owner = a.project_owner or a.repo.split("/")[0]
    dry = a.dry_run

    if not dry:
        run(["gh", "auth", "status"], False)

    state = json.loads(STATE_FILE.read_text()) if STATE_FILE.exists() else {}
    items = sorted((parse(p) for p in TICKETS_DIR.glob("*.md")), key=lambda m: (m["id"][:2], m["type"] != "epic", m["id"]))

    print("→ Labels")
    for name, (color, desc) in LABELS.items():
        run(["gh", "label", "create", name, "--repo", a.repo, "--color", color, "--description", desc, "--force"], dry)

    print("→ Issues")
    for it in items:
        if it["id"] in state:
            print(f"  = {it['title']} (déjà #{state[it['id']]['number']})")
            continue
        body = it["body"]
        if it["depends"]:
            missing = [d for d in it["depends"] if d not in state]
            if missing and not dry:
                sys.exit(f"{it['id']} dépend de tickets non créés : {missing}")
            deps = "\n".join(f"- [ ] #{state[d]['number']}" if d in state else f"- [ ] {d}" for d in it["depends"])
            body += f"\n\n## Dépendances\n{deps}"
        with tempfile.NamedTemporaryFile("w", suffix=".md", delete=False, encoding="utf-8") as tmp:
            tmp.write(body)
        cmd = ["gh", "issue", "create", "--repo", a.repo, "--title", it["title"], "--body-file", tmp.name]
        for l in it["labels"]:
            cmd += ["--label", l]
        url = run(cmd, dry)
        os.unlink(tmp.name)
        if dry:
            state[it["id"]] = {"number": f"<{it['id']}>", "url": "", "dry": True}
            continue
        number = int(url.rstrip("/").split("/")[-1])
        db_id = run(["gh", "api", f"repos/{a.repo}/issues/{number}", "--jq", ".id"], False)
        state[it["id"]] = {"number": number, "url": url, "db_id": int(db_id)}
        print(f"  + #{number} {it['title']}")

        if it["type"] == "ticket":
            epic = state.get(it["epic"])
            if epic:
                run(["gh", "api", "-X", "POST", f"repos/{a.repo}/issues/{epic['number']}/sub_issues",
                     "-F", f"sub_issue_id={db_id}", "--silent"], False)
        if a.project:
            run(["gh", "project", "item-add", str(a.project), "--owner", owner, "--url", url], False)
        STATE_FILE.write_text(json.dumps(state, indent=2))

    print("\nTerminé." if not dry else "\nDry-run terminé : rien n'a été créé.")


if __name__ == "__main__":
    main()

"""Génération des versions WebP responsives d'une photo produit."""

import io
from pathlib import PurePosixPath

from django.core.files.base import ContentFile
from PIL import Image, ImageOps

LARGEURS = (480, 960, 1600)


def nom_version(nom_fichier: str, largeur: int) -> str:
    chemin = PurePosixPath(nom_fichier)
    return str(chemin.with_name(f"{chemin.stem}-{largeur}.webp"))


def generer_versions(fichier, storage) -> tuple[int, int]:
    """Écrit les versions WebP dans le stockage ; renvoie (largeur, hauteur) d'origine.

    Une version n'est jamais plus large que l'original (pas d'agrandissement).
    """
    fichier.open("rb")
    try:
        with Image.open(fichier) as brute:
            image = ImageOps.exif_transpose(brute)
            if image.mode not in ("RGB", "RGBA"):
                image = image.convert("RGBA" if "transparency" in image.info else "RGB")
            largeur_origine, hauteur_origine = image.size
            for largeur in LARGEURS:
                cible = min(largeur, largeur_origine)
                hauteur = max(1, round(hauteur_origine * cible / largeur_origine))
                version = image.resize((cible, hauteur), Image.Resampling.LANCZOS)
                sortie = io.BytesIO()
                version.save(sortie, format="WEBP", quality=82)
                nom = nom_version(fichier.name, largeur)
                if storage.exists(nom):
                    storage.delete(nom)
                storage.save(nom, ContentFile(sortie.getvalue()))
    finally:
        fichier.close()
    return largeur_origine, hauteur_origine


def supprimer_versions(nom_fichier: str, storage) -> None:
    for largeur in LARGEURS:
        nom = nom_version(nom_fichier, largeur)
        if storage.exists(nom):
            storage.delete(nom)

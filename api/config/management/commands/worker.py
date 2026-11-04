"""Processus de fond (service `worker` de Docker Compose).

Exécute en boucle les tâches planifiées. Les tâches elles-mêmes arrivent avec B2-04
(expiration des réservations) : il suffira de les ajouter à TACHES.
"""

import logging
import time

from django.core.management.base import BaseCommand

logger = logging.getLogger("noyer.worker")

# Liste de (nom, fonction) exécutées à chaque passage.
TACHES: list = []


def executer_taches():
    """Lance chaque tâche ; une erreur n'arrête ni les autres tâches ni le worker."""
    for nom, tache in TACHES:
        try:
            tache()
        except Exception:
            logger.exception("Tâche planifiée en échec : %s", nom)


class Command(BaseCommand):
    help = "Exécute les tâches planifiées en boucle."

    def add_arguments(self, parser):
        parser.add_argument("--intervalle", type=int, default=60, help="Secondes entre deux passages.")
        parser.add_argument("--une-fois", action="store_true", help="Un seul passage puis arrêt.")

    def handle(self, *args, **options):
        while True:
            executer_taches()
            if options["une_fois"]:
                return
            time.sleep(options["intervalle"])

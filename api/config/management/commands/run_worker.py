"""Worker planifié avec APScheduler (service `worker` de Docker Compose)."""

from apscheduler.schedulers.blocking import BlockingScheduler
from django.core.management.base import BaseCommand

from config.management.commands.worker import executer_taches


def creer_scheduler(intervalle=60):
    """Planifie `executer_taches` toutes les `intervalle` secondes."""
    scheduler = BlockingScheduler()
    scheduler.add_job(
        executer_taches,
        "interval",
        seconds=intervalle,
        id="taches",
        max_instances=1,
        coalesce=True,
    )
    return scheduler


class Command(BaseCommand):
    help = "Lance le worker : exécute les tâches planifiées toutes les minutes."

    def add_arguments(self, parser):
        parser.add_argument("--intervalle", type=int, default=60, help="Secondes entre deux passages.")

    def handle(self, *args, **options):
        scheduler = creer_scheduler(options["intervalle"])
        # premier passage immédiat, puis toutes les minutes
        executer_taches()
        try:
            scheduler.start()
        except (KeyboardInterrupt, SystemExit):
            pass

from django.db import migrations

# Une pièce ne peut avoir qu'une seule réservation active à la fois.
# Colonne générée (NULL hors des réservations actives) + index unique : MySQL/MariaDB
# ignorent les NULL dans un index unique. Non exprimable par l'ORM, d'où RunSQL.
AJOUTER = """
ALTER TABLE `Reservation`
    ADD COLUMN `id_piece_active` INT
        AS (IF(`statut` = 'Active', `id_piece`, NULL)) PERSISTENT,
    ADD CONSTRAINT `uq_reservation_piece_active` UNIQUE (`id_piece_active`)
"""

SUPPRIMER = """
ALTER TABLE `Reservation`
    DROP INDEX `uq_reservation_piece_active`,
    DROP COLUMN `id_piece_active`
"""


class Migration(migrations.Migration):
    dependencies = [
        ("inventaire", "0001_initial"),
    ]

    operations = [
        migrations.RunSQL(AJOUTER, reverse_sql=SUPPRIMER),
    ]

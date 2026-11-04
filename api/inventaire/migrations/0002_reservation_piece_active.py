from django.db import migrations


class Migration(migrations.Migration):
    """Une seule réservation active par pièce.

    Colonne générée (NULL dès que la réservation n'est plus active) + index unique :
    MariaDB ignore les NULL dans un index unique. Non exprimable par l'ORM, donc RunSQL.
    """

    dependencies = [
        ("inventaire", "0001_initial"),
    ]

    operations = [
        migrations.RunSQL(
            sql=[
                "ALTER TABLE `Reservation` ADD COLUMN `id_piece_active` INT "
                "AS (IF(`statut` = 'Active', `id_piece`, NULL)) PERSISTENT",
                "ALTER TABLE `Reservation` ADD CONSTRAINT `uq_reservation_piece_active` "
                "UNIQUE (`id_piece_active`)",
            ],
            reverse_sql=[
                "ALTER TABLE `Reservation` DROP INDEX `uq_reservation_piece_active`",
                "ALTER TABLE `Reservation` DROP COLUMN `id_piece_active`",
            ],
        ),
    ]

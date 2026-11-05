import secrets

from django.db import models


def nouveau_jeton():
    return secrets.token_urlsafe(32)


class Abonne(models.Model):
    """Abonné à la newsletter. L'inscription n'est effective qu'une fois `confirme_le` renseigné."""

    email = models.EmailField(max_length=254, unique=True)
    jeton = models.CharField(max_length=64, unique=True, default=nouveau_jeton)
    consentement_le = models.DateTimeField()
    confirme_le = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "AbonneNewsletter"

    @property
    def confirme(self):
        return self.confirme_le is not None

    def __str__(self):
        return self.email

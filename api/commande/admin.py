from django.contrib import admin, messages

from config.exceptions import ErreurMetier
from paiement.models import TransactionPaiement

from . import traitement
from .models import Adresse, Commande, LigneCommande


class LectureSeule(admin.TabularInline):
    extra = 0
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False


class LigneInline(LectureSeule):
    model = LigneCommande
    fields = ("nom_produit", "gamme", "prix_unitaire_centimes", "quantite", "piece")
    readonly_fields = fields


class AdresseInline(LectureSeule):
    model = Adresse
    fields = ("type", "nom", "rue", "npa", "localite", "pays")
    readonly_fields = fields


class PaiementInline(LectureSeule):
    model = TransactionPaiement
    fields = ("methode", "prestataire", "montant_centimes", "statut", "date_creation")
    readonly_fields = fields


@admin.register(Commande)
class CommandeAdmin(admin.ModelAdmin):
    """Suivi des commandes : lecture seule, deux actions tracées dans le journal de l'admin."""

    list_display = (
        "reference", "client_email", "statut", "total_ttc_centimes", "a_rembourser",
        "date_creation",
    )
    list_filter = ("statut", "a_rembourser")
    search_fields = ("reference", "client_email")
    actions = ("virement_recu", "expediee")
    inlines = (LigneInline, AdresseInline, PaiementInline)

    def get_readonly_fields(self, request, obj=None):
        return [f.name for f in self.model._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def _appliquer(self, request, queryset, action, libelle):
        for commande in queryset:
            try:
                resultat = action(commande.pk)
            except ErreurMetier as erreur:
                self.message_user(
                    request, f"{commande.reference} : {erreur.detail}", messages.ERROR
                )
                continue
            if resultat is False:
                self.log_change(request, commande, f"{libelle} : article indisponible")
                self.message_user(
                    request,
                    f"{commande.reference} : article indisponible, commande à rembourser.",
                    messages.WARNING,
                )
                continue
            self.log_change(request, commande, libelle)
            self.message_user(request, f"{commande.reference} : {libelle}.")

    @admin.action(description="Virement reçu")
    def virement_recu(self, request, queryset):
        self._appliquer(request, queryset, traitement.marquer_virement_recu, "Virement reçu")

    @admin.action(description="Expédiée")
    def expediee(self, request, queryset):
        self._appliquer(request, queryset, traitement.marquer_expediee, "Commande expédiée")

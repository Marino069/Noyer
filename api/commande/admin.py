import json

from django.contrib import admin, messages
from django.http import HttpResponse
from django.template.response import TemplateResponse

from config.exceptions import ErreurMetier
from paiement.models import TransactionPaiement

from . import nlpd, traitement
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
    actions = ("virement_recu", "expediee", "exporter_nlpd", "anonymiser_nlpd")
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

    def _email_unique(self, request, queryset):
        emails = sorted(
            {c.client_email.lower() for c in queryset if not nlpd.est_anonyme(c.client_email)}
        )
        if len(emails) != 1:
            self.message_user(
                request, "Sélectionnez les commandes d'un seul client.", messages.ERROR
            )
            return None
        return emails[0]

    @admin.action(description="nLPD : exporter les données du client (JSON)")
    def exporter_nlpd(self, request, queryset):
        email = self._email_unique(request, queryset)
        if email is None:
            return None
        for commande in queryset:
            self.log_change(request, commande, "Export nLPD")
        contenu = json.dumps(nlpd.exporter(email), ensure_ascii=False, indent=2)
        reponse = HttpResponse(contenu, content_type="application/json; charset=utf-8")
        reponse["Content-Disposition"] = 'attachment; filename="export-nlpd.json"'
        return reponse

    @admin.action(description="nLPD : anonymiser le client (irréversible)")
    def anonymiser_nlpd(self, request, queryset):
        email = self._email_unique(request, queryset)
        if email is None:
            return None
        if "confirmer" not in request.POST:
            return TemplateResponse(
                request,
                "admin/commande/anonymiser.html",
                {
                    **self.admin_site.each_context(request),
                    "opts": self.model._meta,
                    "email": email,
                    "commandes": queryset,
                    "action": "anonymiser_nlpd",
                    "selection": request.POST.getlist("_selected_action"),
                },
            )
        pks = list(queryset.values_list("pk", flat=True))
        total = nlpd.anonymiser(email)
        # Journal écrit après coup : il ne contient que des références, plus l'email.
        for commande in Commande.objects.filter(pk__in=pks):
            self.log_change(request, commande, "Anonymisation nLPD")
        self.message_user(request, f"{total} commande(s) anonymisée(s).")
        return None

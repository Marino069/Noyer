from django import forms
from django.contrib import admin, messages

from config.exceptions import ErreurMetier

from .models import StockClassic
from .services import definir_stock_classic


class StockClassicForm(forms.ModelForm):
    class Meta:
        model = StockClassic
        fields = ("quantite_dispo",)

    def clean_quantite_dispo(self):
        quantite = self.cleaned_data["quantite_dispo"]
        reservee = self.instance.quantite_reservee
        if quantite < reservee:
            raise forms.ValidationError(
                f"La quantité disponible ne peut pas être inférieure à la quantité réservée "
                f"({reservee})."
            )
        return quantite


@admin.register(StockClassic)
class StockClassicAdmin(admin.ModelAdmin):
    """Stock Classic : quantité disponible modifiable, quantité réservée en lecture seule."""

    form = StockClassicForm
    list_display = ("produit", "quantite_dispo", "quantite_reservee", "date_modification")
    readonly_fields = ("produit", "quantite_reservee", "date_modification")
    search_fields = ("produit__slug", "produit__modele__nom")

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("produit")

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def save_model(self, request, obj, form, change):
        # Revalide sous verrou : une réservation a pu arriver depuis l'ouverture du formulaire.
        try:
            definir_stock_classic(obj, form.cleaned_data["quantite_dispo"])
        except ErreurMetier as erreur:
            self.message_user(request, str(erreur.detail), messages.ERROR)

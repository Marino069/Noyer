from decimal import ROUND_HALF_UP, Decimal

from django import forms
from django.contrib import admin

from .models import Gamme, Matiere, Media, Modele, Produit, ProduitMatiere


class ProduitForm(forms.ModelForm):
    """Le prix se saisit en francs ; il est stocké en centimes entiers."""

    prix_chf = forms.DecimalField(
        label="Prix TTC (CHF)", min_value=Decimal(0), max_digits=9, decimal_places=2
    )

    class Meta:
        model = Produit
        exclude = ("prix_ttc_centimes",)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance.pk:
            self.fields["prix_chf"].initial = Decimal(self.instance.prix_ttc_centimes) / 100

    def save(self, commit=True):
        francs = self.cleaned_data["prix_chf"]
        self.instance.prix_ttc_centimes = int(
            (francs * 100).quantize(Decimal(1), rounding=ROUND_HALF_UP)
        )
        return super().save(commit=commit)


class ProduitMatiereInline(admin.TabularInline):
    model = ProduitMatiere
    extra = 1


class MediaInline(admin.TabularInline):
    model = Media
    extra = 1


@admin.register(Modele)
class ModeleAdmin(admin.ModelAdmin):
    list_display = ("nom", "slug", "date_creation")
    search_fields = ("nom", "slug")
    prepopulated_fields = {"slug": ("nom",)}


@admin.register(Matiere)
class MatiereAdmin(admin.ModelAdmin):
    list_display = ("nom",)
    search_fields = ("nom",)


@admin.register(Gamme)
class GammeAdmin(admin.ModelAdmin):
    """Les gammes sont fixes (Classic, Premium) : lecture seule."""

    list_display = ("code", "nom")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_view_permission(self, request, obj=None):
        return request.user.is_active and request.user.is_staff


@admin.register(Produit)
class ProduitAdmin(admin.ModelAdmin):
    form = ProduitForm
    list_display = ("slug", "modele", "gamme", "prix_affiche", "actif", "mis_en_avant")
    list_editable = ("mis_en_avant",)
    list_filter = ("gamme", "actif", "mis_en_avant")
    search_fields = ("slug", "modele__nom")
    prepopulated_fields = {"slug": ("modele", "gamme")}
    inlines = [ProduitMatiereInline, MediaInline]

    @admin.display(description="Prix TTC (CHF)", ordering="prix_ttc_centimes")
    def prix_affiche(self, obj):
        return f"{Decimal(obj.prix_ttc_centimes) / 100:.2f}"

    def get_readonly_fields(self, request, obj=None):
        readonly = list(super().get_readonly_fields(request, obj))
        if obj is not None and obj.actif:
            readonly.append("slug")
        return readonly

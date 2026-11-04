import django_filters

from .models import Gamme, Produit


class ProduitFilter(django_filters.FilterSet):
    gamme = django_filters.ChoiceFilter(field_name="gamme__code", choices=Gamme.Code.choices)
    mis_en_avant = django_filters.BooleanFilter(field_name="mis_en_avant")

    class Meta:
        model = Produit
        fields = ["gamme", "mis_en_avant"]

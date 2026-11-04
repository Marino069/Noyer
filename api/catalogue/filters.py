import django_filters

from .models import Gamme, Produit


class ProduitFilter(django_filters.FilterSet):
    gamme = django_filters.ChoiceFilter(field_name="gamme__code", choices=Gamme.Code.choices)

    class Meta:
        model = Produit
        fields = ["gamme"]

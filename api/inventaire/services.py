"""Règles métier de l'inventaire. `reserver` est la règle la plus critique du projet :
tout se passe dans une transaction, sur des lignes verrouillées."""

from datetime import timedelta

from django.db import IntegrityError, transaction
from django.db.models import F
from django.utils import timezone

from catalogue.models import Gamme
from config.exceptions import (
    DonneesInvalides,
    PieceIndisponible,
    ReservationNonLiberable,
    StockInsuffisant,
)

from .models import Piece, Reservation, StockClassic

DUREE_RESERVATION = timedelta(minutes=15)


def reserver(produit, quantite, panier_id, numero=None):
    """Réserve `quantite` exemplaires de `produit` pour le panier `panier_id`.

    Premium : une seule pièce, `numero` demandé ou à défaut le plus petit disponible.
    Classic : `quantite` unités du stock. Retourne la Reservation active créée.
    PieceIndisponible / StockInsuffisant (409) : rien n'est modifié.
    """
    if quantite < 1:
        raise DonneesInvalides("La quantité doit être d'au moins 1.")
    with transaction.atomic():
        if produit.gamme.code == Gamme.Code.PREMIUM:
            return _reserver_premium(produit, quantite, panier_id, numero)
        return _reserver_classic(produit, quantite, panier_id)


def _reserver_premium(produit, quantite, panier_id, numero):
    if quantite != 1:
        raise DonneesInvalides("Une pièce numérotée se réserve à l'unité.")
    pieces = Piece.objects.select_for_update().filter(
        serie__produit=produit, statut=Piece.Statut.DISPONIBLE
    )
    if numero is not None:
        pieces = pieces.filter(numero=numero)
    # sans numéro demandé : le plus petit numéro encore disponible
    piece = pieces.order_by("numero", "serie_id").first()
    if piece is None:
        raise PieceIndisponible()
    try:
        # savepoint : l'IntegrityError ne doit pas casser la transaction englobante
        with transaction.atomic():
            reservation = Reservation.objects.create(
                produit=produit,
                quantite=1,
                panier_id=panier_id,
                piece=piece,
                expire_le=timezone.now() + DUREE_RESERVATION,
                statut=Reservation.Statut.ACTIVE,
            )
    except IntegrityError:
        # contrainte « une seule réservation active par pièce »
        raise PieceIndisponible() from None
    Piece.objects.filter(pk=piece.pk).update(statut=Piece.Statut.RESERVEE, version=F("version") + 1)
    return reservation


def _reserver_classic(produit, quantite, panier_id):
    stock = StockClassic.objects.select_for_update().filter(produit=produit).first()
    if stock is None or stock.quantite_dispo - stock.quantite_reservee < quantite:
        raise StockInsuffisant()
    stock.quantite_reservee += quantite
    stock.save(update_fields=["quantite_reservee", "date_modification"])
    return Reservation.objects.create(
        produit=produit,
        quantite=quantite,
        panier_id=panier_id,
        expire_le=timezone.now() + DUREE_RESERVATION,
        statut=Reservation.Statut.ACTIVE,
    )


def liberer(reservation):
    """Libère une réservation active : l'article redevient disponible.

    Idempotente : une réservation déjà annulée ou expirée n'est pas touchée.
    ReservationNonLiberable (409) si elle est confirmée (vendue).
    """
    with transaction.atomic():
        # relecture verrouillée : l'instance reçue peut être périmée
        reservation = Reservation.objects.select_for_update().get(pk=reservation.pk)
        if reservation.statut == Reservation.Statut.CONFIRMEE:
            raise ReservationNonLiberable()
        if reservation.statut != Reservation.Statut.ACTIVE:
            return reservation
        if reservation.piece_id is not None:
            piece = Piece.objects.select_for_update().get(pk=reservation.piece_id)
            if piece.statut == Piece.Statut.RESERVEE:
                piece.statut = Piece.Statut.DISPONIBLE
                piece.version += 1
                piece.save(update_fields=["statut", "version"])
        else:
            stock = StockClassic.objects.select_for_update().get(produit_id=reservation.produit_id)
            stock.quantite_reservee = max(0, stock.quantite_reservee - reservation.quantite)
            stock.save(update_fields=["quantite_reservee", "date_modification"])
        reservation.statut = Reservation.Statut.ANNULEE
        reservation.save(update_fields=["statut"])
        return reservation

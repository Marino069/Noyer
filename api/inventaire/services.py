"""Règles métier de l'inventaire. `reserver` est la règle la plus critique du projet :
tout se passe dans une transaction, sur des lignes verrouillées."""

import logging
from datetime import timedelta

from django.db import IntegrityError, transaction
from django.db.models import F
from django.utils import timezone

from catalogue.models import Gamme, Produit
from config.exceptions import (
    DonneesInvalides,
    PieceIndisponible,
    ReservationNonLiberable,
    StockInsuffisant,
)

from .models import Piece, Reservation, Serie, StockClassic

logger = logging.getLogger("noyer.inventaire")

DUREE_RESERVATION =timedelta(minutes=15)

TAILLE_SERIE_MAX = 999


def creer_serie(produit, taille):
    """Crée une Serie de `taille` pièces numérotées de 1 à `taille` pour un produit Premium.

    Tout se fait dans une transaction : si une pièce échoue, rien n'est créé.
    DonneesInvalides (422) si le produit n'est pas Premium ou si la taille est invalide.
    """
    taille_valide = (
        isinstance(taille, int) and not isinstance(taille, bool) and 1 <= taille <= TAILLE_SERIE_MAX
    )
    if not taille_valide:
        raise DonneesInvalides(f"La taille doit être un entier entre 1 et {TAILLE_SERIE_MAX}.")
    with transaction.atomic():
        produit = Produit.objects.select_for_update().select_related("gamme").get(pk=produit.pk)
        if produit.gamme.code != Gamme.Code.PREMIUM:
            raise DonneesInvalides("Une série ne peut être créée que pour un produit Premium.")
        serie = Serie.objects.create(produit=produit, taille_serie=taille)
        Piece.objects.bulk_create(Piece(serie=serie, numero=n) for n in range(1, taille + 1))
        return serie


def definir_stock_classic(stock, quantite_dispo):
    """Fixe la quantité disponible d'un stock Classic, sans descendre sous la quantité réservée.

    Ligne verrouillée dans une transaction. StockInsuffisant (409) si la valeur est
    inférieure à la quantité réservée ; DonneesInvalides (422) si elle est invalide.
    """
    valide = (
        isinstance(quantite_dispo, int) and not isinstance(quantite_dispo, bool) and quantite_dispo >= 0
    )
    if not valide:
        raise DonneesInvalides("La quantité disponible doit être un entier positif ou nul.")
    with transaction.atomic():
        stock = StockClassic.objects.select_for_update().get(pk=stock.pk)
        if quantite_dispo < stock.quantite_reservee:
            raise StockInsuffisant(
                f"La quantité disponible ne peut pas être inférieure à la quantité réservée "
                f"({stock.quantite_reservee})."
            )
        stock.quantite_dispo = quantite_dispo
        stock.save(update_fields=["quantite_dispo", "date_modification"])
        return stock


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


def modifier_quantite(reservation, quantite):
    """Change la quantité d'une réservation Classic active, en ajustant le stock réservé.

    Retourne la réservation mise à jour, ou None si elle n'est plus active (expirée ou
    annulée) : l'appelant doit alors réserver à nouveau.
    StockInsuffisant (409) : rien n'est modifié.
    """
    if quantite < 1:
        raise DonneesInvalides("La quantité doit être d'au moins 1.")
    with transaction.atomic():
        reservation = Reservation.objects.select_for_update().get(pk=reservation.pk)
        if reservation.statut != Reservation.Statut.ACTIVE:
            return None
        stock = (
            StockClassic.objects.select_for_update()
            .filter(produit_id=reservation.produit_id)
            .first()
        )
        delta = quantite - reservation.quantite
        if stock is None or (delta > 0 and stock.quantite_dispo - stock.quantite_reservee < delta):
            raise StockInsuffisant()
        stock.quantite_reservee = max(0, stock.quantite_reservee + delta)
        stock.save(update_fields=["quantite_reservee", "date_modification"])
        reservation.quantite = quantite
        reservation.save(update_fields=["quantite"])
        return reservation


def liberer(reservation, statut_final=Reservation.Statut.ANNULEE):
    """Libère une réservation active : l'article redevient disponible.

    Idempotente : une réservation déjà annulée ou expirée n'est pas touchée.
    ReservationNonLiberable (409) si elle est confirmée (vendue).
    `statut_final` : Annulee (par défaut) ou Expiree (expiration automatique).
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
        reservation.statut = statut_final
        reservation.save(update_fields=["statut"])
        return reservation


def confirmer(reservation):
    """Transforme une réservation active en vente (paiement confirmé).

    Premium : la pièce passe à Vendue. Classic : stock disponible et réservé baissent de la
    quantité vendue. Idempotente. Retourne False si la réservation n'est ni active ni
    confirmée (expirée, annulée) : l'appelant doit le signaler.
    """
    with transaction.atomic():
        reservation = Reservation.objects.select_for_update().get(pk=reservation.pk)
        if reservation.statut == Reservation.Statut.CONFIRMEE:
            return True
        if reservation.statut != Reservation.Statut.ACTIVE:
            return False
        if reservation.piece_id is not None:
            Piece.objects.filter(pk=reservation.piece_id).update(
                statut=Piece.Statut.VENDUE, version=F("version") + 1
            )
        else:
            stock = StockClassic.objects.select_for_update().get(produit_id=reservation.produit_id)
            stock.quantite_dispo = max(0, stock.quantite_dispo - reservation.quantite)
            stock.quantite_reservee = max(0, stock.quantite_reservee - reservation.quantite)
            stock.save(update_fields=["quantite_dispo", "quantite_reservee", "date_modification"])
        reservation.statut = Reservation.Statut.CONFIRMEE
        reservation.save(update_fields=["statut"])
        return True


def vendre_apres_expiration(reservation):
    """Paiement reçu alors que la réservation a expiré ou été annulée : vend si l'article
    est encore libre (pièce Disponible / stock suffisant), sinon retourne False sans rien
    modifier. À appeler dans une transaction. Une réservation encore active ou confirmée
    est traitée par `confirmer`."""
    reservation = Reservation.objects.select_for_update().get(pk=reservation.pk)
    if reservation.statut in (Reservation.Statut.ACTIVE, Reservation.Statut.CONFIRMEE):
        return confirmer(reservation)
    if reservation.piece_id is not None:
        piece = Piece.objects.select_for_update().get(pk=reservation.piece_id)
        if piece.statut != Piece.Statut.DISPONIBLE:
            return False
        piece.statut = Piece.Statut.VENDUE
        piece.version += 1
        piece.save(update_fields=["statut", "version"])
    else:
        stock = StockClassic.objects.select_for_update().get(produit_id=reservation.produit_id)
        if stock.quantite_dispo - stock.quantite_reservee < reservation.quantite:
            return False
        stock.quantite_dispo -= reservation.quantite
        stock.save(update_fields=["quantite_dispo", "date_modification"])
    reservation.statut = Reservation.Statut.CONFIRMEE
    reservation.save(update_fields=["statut"])
    return True


def expirer_reservations(maintenant=None):
    """Passe en Expiree et libère les réservations Active dont `expire_le` est dépassé.

    Chaque réservation a sa propre transaction (dans `liberer`) : une erreur sur l'une
    est journalisée et n'empêche pas de traiter les autres. Retourne le nombre expiré.
    """
    maintenant = maintenant or timezone.now()
    ids = list(
        Reservation.objects.filter(statut=Reservation.Statut.ACTIVE, expire_le__lte=maintenant)
        .order_by("expire_le")
        .values_list("pk", flat=True)
    )
    expirees = 0
    for pk in ids:
        try:
            with transaction.atomic():
                reservation = Reservation.objects.select_for_update().get(pk=pk)
                # relue sous verrou : peut avoir été confirmée ou libérée entre-temps
                if reservation.statut != Reservation.Statut.ACTIVE or reservation.expire_le > maintenant:
                    continue
                liberer(reservation, Reservation.Statut.EXPIREE)
                expirees += 1
        except Exception:
            logger.exception("Expiration de la réservation %s en échec", pk)
    return expirees

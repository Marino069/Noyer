import logging

from rest_framework import status
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger("noyer.api")

MESSAGE_INTERNE = "Une erreur interne est survenue."


class ErreurMetier(APIException):
    """Exception métier : code HTTP et code d'erreur stables."""


class PieceIndisponible(ErreurMetier):
    status_code = status.HTTP_409_CONFLICT
    default_code = "piece_indisponible"
    default_detail = "Cette pièce vient d'être réservée."


class StockInsuffisant(ErreurMetier):
    status_code = status.HTTP_409_CONFLICT
    default_code = "stock_insuffisant"
    default_detail = "Le stock disponible est insuffisant."


class DejaPayee(ErreurMetier):
    status_code = status.HTTP_409_CONFLICT
    default_code = "deja_payee"
    default_detail = "Cette commande est déjà payée."


class ReservationExpiree(ErreurMetier):
    status_code = status.HTTP_410_GONE
    default_code = "reservation_expiree"
    default_detail = "Votre réservation a expiré."


class DonneesInvalides(ErreurMetier):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_code = "validation"
    default_detail = "Données invalides."


CODES_PAR_STATUT = {
    400: "validation",
    401: "non_authentifie",
    403: "interdit",
    404: "introuvable",
    405: "methode_non_autorisee",
    406: "non_acceptable",
    415: "media_non_supporte",
    422: "validation",
    429: "trop_de_requetes",
}


def erreur(code, message, statut, details=None):
    corps = {"code": code, "message": str(message)}
    if details is not None:
        corps["details"] = details
    return Response({"erreur": corps}, status=statut)


def exception_handler(exc, context):
    response = drf_exception_handler(exc, context)
    if response is None:
        # Exception non prévue : journalisée, jamais exposée au client.
        logger.error(
            "Erreur interne non gérée",
            exc_info=(type(exc), exc, exc.__traceback__),
            extra={"view": str(context.get("view"))},
        )
        return erreur("erreur_interne", MESSAGE_INTERNE, status.HTTP_500_INTERNAL_SERVER_ERROR)

    if isinstance(exc, ValidationError):
        return erreur(
            "validation",
            "Les données envoyées sont invalides.",
            response.status_code,
            details=response.data,
        )

    if isinstance(exc, APIException):
        if response.status_code >= 500:
            logger.error(
                "Erreur API %s", response.status_code, exc_info=(type(exc), exc, exc.__traceback__)
            )
            return erreur("erreur_interne", MESSAGE_INTERNE, response.status_code)
        if isinstance(exc, ErreurMetier):
            code = exc.default_code
        else:
            code = CODES_PAR_STATUT.get(response.status_code, exc.default_code)
        return erreur(code, exc.detail, response.status_code)

    # Http404 / PermissionDenied convertis par DRF
    code = CODES_PAR_STATUT.get(response.status_code, "erreur")
    detail = response.data.get("detail", "") if isinstance(response.data, dict) else ""
    return erreur(code, detail, response.status_code)

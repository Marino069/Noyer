import type { ErreurApi } from "./types";

export type ApiErrorKind = "network" | "timeout" | "http" | "invalid_response";

/** Erreur uniforme : tout échec du client est converti en ApiError, jamais levé brut. */
export type ApiError = {
  kind: ApiErrorKind;
  /** Statut HTTP, 0 si la requête n'a pas abouti. */
  status: number;
  /** Code métier du back (`piece_indisponible`…) ou code technique du client. */
  code: string;
  message: string;
  details?: Record<string, string[]>;
};

export type ApiResult<T> =
  { ok: true; data: T } | { ok: false; error: ApiError };

export const networkError = (): ApiError => ({
  kind: "network",
  status: 0,
  code: "reseau",
  message: "Impossible de joindre le serveur.",
});

export const timeoutError = (): ApiError => ({
  kind: "timeout",
  status: 0,
  code: "delai_depasse",
  message: "Le serveur met trop de temps à répondre.",
});

export const invalidResponseError = (status: number): ApiError => ({
  kind: "invalid_response",
  status,
  code: "reponse_invalide",
  message: "Réponse inattendue du serveur.",
});

export function httpError(status: number, body: unknown): ApiError {
  const erreur = (body as Partial<ErreurApi> | null)?.erreur;
  return {
    kind: "http",
    status,
    code: typeof erreur?.code === "string" ? erreur.code : `http_${status}`,
    message:
      typeof erreur?.message === "string"
        ? erreur.message
        : "Une erreur est survenue.",
    details: erreur?.details,
  };
}

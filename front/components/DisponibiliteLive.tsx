"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, type ApiResult, type Disponibilite } from "@/lib/api";

/** Stock limité : on réinterroge l'API toutes les 30 s et au retour sur l'onglet. */
export const REFRESH_INTERVAL_MS = 30_000;

type Value = {
  /** Dernière disponibilité connue (rendu serveur, puis rafraîchie côté client). */
  disponibilite: Disponibilite | null;
  refresh: () => Promise<void>;
};

const Context = createContext<Value>({
  disponibilite: null,
  refresh: async () => {},
});

export const useDisponibilite = () => useContext(Context);

/**
 * Garde la disponibilité d'un produit à jour côté client, sans cache : la valeur du rendu
 * serveur sert de point de départ, puis elle est rafraîchie au montage, à intervalle
 * régulier, quand l'onglet redevient visible et à la demande (`refresh`).
 */
export function DisponibiliteLive({
  slug,
  initial,
  children,
}: {
  slug: string;
  initial: ApiResult<Disponibilite>;
  children: ReactNode;
}) {
  const [disponibilite, setDisponibilite] = useState<Disponibilite | null>(
    initial.ok ? initial.data : null,
  );

  const refresh = useCallback(async () => {
    const result = await api.disponibilite(slug);
    // En cas d'échec on garde la dernière valeur connue plutôt que de masquer le stock.
    if (result.ok) setDisponibilite(result.data);
  }, [slug]);

  useEffect(() => {
    const first = setTimeout(() => void refresh(), 0); // dès le montage
    const timer = setInterval(() => void refresh(), REFRESH_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const value = useMemo(
    () => ({ disponibilite, refresh }),
    [disponibilite, refresh],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

/** Épuisé = plus aucune unité (Classic) ni aucune pièce numérotée (Premium). */
export function estEpuise(d: Disponibilite | null): boolean {
  if (!d) return false;
  return d.gamme === "Classic"
    ? d.quantite_disponible <= 0
    : d.series.every((s) => s.pieces_restantes <= 0);
}

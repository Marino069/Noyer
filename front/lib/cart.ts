import { useSyncExternalStore } from "react";
import { api, type Panier } from "@/lib/api";

// Nombre d'articles du panier, partagé par tous les composants (header, page panier…).
// `null` tant que le panier n'est pas connu (premier rendu, erreur réseau).
let count: number | null = null;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Total des quantités (une ligne Premium vaut 1, une ligne Classic vaut `quantite`). */
export const countArticles = (panier: Panier): number =>
  panier.lignes.reduce((total, ligne) => total + ligne.quantite, 0);

/**
 * À appeler avec le panier renvoyé par chaque mutation (ajout, modification, suppression) :
 * l'indicateur du header se met à jour sans nouvel appel réseau.
 */
export function publishCart(panier: Panier): void {
  const next = countArticles(panier);
  if (next === count) return;
  count = next;
  listeners.forEach((listener) => listener());
}

/** Relit le panier côté back ; en cas d'échec, on garde la dernière valeur connue. */
export async function refreshCart(signal?: AbortSignal): Promise<void> {
  const result = await api.panier({ signal });
  if (result.ok) publishCart(result.data);
}

export const useCartCount = (): number | null =>
  useSyncExternalStore(
    subscribe,
    () => count,
    () => null,
  );

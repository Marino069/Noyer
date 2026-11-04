import { request, type RequestOptions } from "./client";
import type {
  Commande,
  CommandeCreation,
  CommandeCreee,
  ContactMessage,
  Disponibilite,
  Gamme,
  HeroAccueil,
  MatiereAccueil,
  Modele,
  Page,
  Paiement,
  Panier,
  ProduitDetail,
  ProduitResume,
} from "./types";

export * from "./errors";
export * from "./types";

type Signal = Pick<RequestOptions, "signal">;

export const api = {
  produits: (
    query: { gamme?: Gamme; mis_en_avant?: true; page?: number } = {},
    opts?: Signal,
  ) => request<Page<ProduitResume>>("/produits/", { query, ...opts }),
  produit: (slug: string, opts?: Signal) =>
    request<ProduitDetail>(`/produits/${slug}/`, opts),
  modele: (slug: string, opts?: Signal) =>
    request<Modele>(`/modeles/${slug}/`, opts),
  disponibilite: (slug: string, opts?: Signal) =>
    request<Disponibilite>(`/produits/${slug}/disponibilite/`, {
      noStore: true,
      ...opts,
    }),

  panier: (opts?: Signal) => request<Panier>("/panier/", opts),
  ajouterLigne: (body: {
    produit_slug: string;
    quantite: number;
    numero?: number;
  }) => request<Panier>("/panier/lignes/", { method: "POST", body }),
  modifierLigne: (id: string, quantite: number) =>
    request<Panier>(`/panier/lignes/${id}/`, {
      method: "PATCH",
      body: { quantite },
    }),
  supprimerLigne: (id: string) =>
    request<Panier>(`/panier/lignes/${id}/`, { method: "DELETE" }),

  creerCommande: (body: CommandeCreation) =>
    request<CommandeCreee>("/commandes/", { method: "POST", body }),
  commande: (reference: string, email: string, opts?: Signal) =>
    request<Commande>(`/commandes/${reference}/`, {
      query: { email },
      ...opts,
    }),
  payer: (reference: string, methode: "stripe" | "virement") =>
    request<Paiement>(`/commandes/${reference}/paiement/`, {
      method: "POST",
      body: { methode },
      // La création de la session Stripe peut être plus lente qu'un GET.
      timeoutMs: 15000,
    }),

  contact: (body: ContactMessage) =>
    request<null>("/contact/", { method: "POST", body }),
  newsletter: (body: { email: string; consentement: boolean }) =>
    request<null>("/newsletter/", { method: "POST", body }),
  heroAccueil: (opts?: Signal) =>
    request<HeroAccueil>("/contenu/accueil/hero/", opts),
  matiereAccueil: (opts?: Signal) =>
    request<MatiereAccueil>("/contenu/accueil/matiere/", opts),
  health: (opts?: Signal) => request<{ statut: string }>("/health/", opts),
};

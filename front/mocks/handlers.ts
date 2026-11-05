import { http, HttpResponse } from "msw";
import { API_URL } from "@/lib/env";
import type { CommandeCreation, Disponibilite, Panier } from "@/lib/api/types";
import {
  detailDe,
  heroAccueil,
  matiereAccueil,
  modeleComplet,
  pagesContenu,
  produits,
  slugsMisEnAvant,
} from "./data";

const base = API_URL.replace(/\/$/, "");
const url = (path: string) => `${base}${path}`;

const erreur = (status: number, code: string, message: string) =>
  HttpResponse.json({ erreur: { code, message } }, { status });

// Panier en mémoire (le vrai back l'identifie par cookie HttpOnly).
let lignes: Panier["lignes"] = [];
let nextLigne = 1;

function panier(): Panier {
  const sous_total = lignes.reduce(
    (t, l) => t + l.produit.prix_ttc_centimes * l.quantite,
    0,
  );
  return {
    lignes,
    sous_total_centimes: sous_total,
    frais_livraison_centimes: 0,
    tva_incluse_centimes: Math.round((sous_total * 8.1) / 108.1),
    taux_tva: "8.10",
    total_centimes: sous_total,
  };
}

const disponibilites = (gamme: string): Disponibilite =>
  gamme === "Premium"
    ? {
        gamme,
        series: [
          {
            id: 1,
            taille_serie: 50,
            pieces_restantes: 3,
            numeros_disponibles: [3, 8, 15],
          },
        ],
      }
    : { gamme: "Classic", quantite_disponible: 7 };

export const handlers = [
  http.get(url("/health/"), () => HttpResponse.json({ statut: "ok" })),

  http.get(url("/contenu/accueil/hero/"), () => HttpResponse.json(heroAccueil)),

  http.get(url("/contenu/pages/:slug/"), ({ params, request }) => {
    const apercu = new URL(request.url).searchParams.get("apercu");
    const page = pagesContenu[String(params.slug)];
    if (!page || (page.brouillon && !apercu))
      return erreur(404, "introuvable", "Page introuvable.");
    return HttpResponse.json(page.contenu);
  }),

  http.get(url("/contenu/accueil/matiere/"), () =>
    HttpResponse.json(matiereAccueil),
  ),

  http.get(url("/produits/"), ({ request }) => {
    const params = new URL(request.url).searchParams;
    const gamme = params.get("gamme");
    const misEnAvant = params.get("mis_en_avant") === "true";
    const results = produits.filter(
      (p) =>
        (!gamme || p.gamme === gamme) &&
        (!misEnAvant || slugsMisEnAvant.includes(p.slug)),
    );
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),
  http.get(url("/produits/:slug/"), ({ params }) => {
    const p = produits.find((x) => x.slug === params.slug);
    return p
      ? HttpResponse.json(detailDe(p))
      : erreur(404, "introuvable", "Produit introuvable.");
  }),
  http.get(url("/produits/:slug/disponibilite/"), ({ params }) => {
    const p = produits.find((x) => x.slug === params.slug);
    return p
      ? HttpResponse.json(disponibilites(p.gamme))
      : erreur(404, "introuvable", "Produit introuvable.");
  }),
  http.get(url("/modeles/:slug/"), ({ params }) => {
    const m = modeleComplet(String(params.slug));
    return m
      ? HttpResponse.json(m)
      : erreur(404, "introuvable", "Modèle introuvable.");
  }),

  http.get(url("/panier/"), () => HttpResponse.json(panier())),
  http.post(url("/panier/lignes/"), async ({ request }) => {
    const body = (await request.json()) as {
      produit_slug: string;
      quantite: number;
      numero?: number;
    };
    const produit = produits.find((p) => p.slug === body.produit_slug);
    if (!produit) return erreur(404, "introuvable", "Produit introuvable.");
    if (
      produit.gamme === "Premium" &&
      lignes.some(
        (l) =>
          l.produit.slug === produit.slug && l.numero_piece === body.numero,
      )
    ) {
      return erreur(
        409,
        "piece_indisponible",
        "Cette pièce vient d'être réservée.",
      );
    }
    lignes = [
      ...lignes,
      {
        id: `l${nextLigne++}`,
        produit,
        quantite: body.quantite,
        numero_piece: body.numero ?? null,
        reservation_expire_le:
          produit.gamme === "Premium"
            ? new Date(Date.now() + 15 * 60_000).toISOString()
            : null,
      },
    ];
    return HttpResponse.json(panier(), { status: 201 });
  }),
  http.patch(url("/panier/lignes/:id/"), async ({ params, request }) => {
    const { quantite } = (await request.json()) as { quantite: number };
    if (quantite > 7)
      return erreur(409, "stock_insuffisant", "Stock insuffisant.");
    lignes = lignes.map((l) => (l.id === params.id ? { ...l, quantite } : l));
    return HttpResponse.json(panier());
  }),
  http.delete(url("/panier/lignes/:id/"), ({ params }) => {
    lignes = lignes.filter((l) => l.id !== params.id);
    return HttpResponse.json(panier());
  }),

  http.post(url("/commandes/"), async ({ request }) => {
    const body = (await request.json()) as CommandeCreation;
    if (!body.cgv_acceptees || !body.email) {
      return HttpResponse.json(
        {
          erreur: {
            code: "validation",
            message: "Données invalides.",
            details: { cgv_acceptees: ["Les CGV doivent être acceptées."] },
          },
        },
        { status: 422 },
      );
    }
    const total = panier().total_centimes;
    lignes = [];
    return HttpResponse.json(
      {
        reference: "NOY-2026-00042",
        statut: "EnAttente",
        total_centimes: total,
      },
      { status: 201 },
    );
  }),
  http.get(url("/commandes/:reference/"), ({ params, request }) => {
    const email = new URL(request.url).searchParams.get("email");
    if (params.reference !== "NOY-2026-00042" || !email) {
      return erreur(404, "introuvable", "Commande introuvable.");
    }
    return HttpResponse.json({
      reference: params.reference,
      statut: "EnAttente",
      cree_le: "2026-10-05T14:30:00+02:00",
      lignes: [
        {
          nom_produit: "Lucerne Premium",
          gamme: "Premium",
          numero_piece: 7,
          prix_unitaire_centimes: 124000,
          quantite: 1,
        },
      ],
      total_centimes: 124000,
    });
  }),
  http.post(
    url("/commandes/:reference/paiement/"),
    async ({ params, request }) => {
      const { methode } = (await request.json()) as {
        methode: "stripe" | "virement";
      };
      return methode === "virement"
        ? HttpResponse.json({
            methode,
            iban: "CH9300762011623852957",
            beneficiaire: "Noyer",
            reference: params.reference,
            delai_jours: 5,
          })
        : HttpResponse.json({
            methode,
            url_paiement: "https://checkout.stripe.com/mock",
          });
    },
  ),

  http.post(url("/contact/"), () => new HttpResponse(null, { status: 204 })),
  http.post(url("/newsletter/"), () => new HttpResponse(null, { status: 202 })),
];

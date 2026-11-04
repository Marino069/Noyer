import type {
  HeroAccueil,
  Image,
  MatiereAccueil,
  Modele,
  ProduitDetail,
  ProduitResume,
} from "@/lib/api/types";

const image = (alt: string): Image => ({
  alt,
  largeur_origine: 1600,
  hauteur_origine: 1200,
  sources: [480, 960, 1600].map((largeur) => ({
    largeur: largeur as 480 | 960 | 1600,
    url: `/mocks/lampe-${largeur}.webp`,
  })),
});

export const heroAccueil: HeroAccueil = {
  titre: "Une lumière qui prend son temps",
  mot_italique: "prend son temps",
  sous_titre:
    "Lampes semi-artisanales en noyer et laiton, assemblées à Genève. Deux gammes, mêmes formes, matières différentes.",
  cta_libelle: "Découvrir les lampes",
  cta_chemin: "/produits/classic",
  image: image("Lampe en noyer posée sur une table, dans la lumière du matin"),
};

export const matiereAccueil: MatiereAccueil = {
  titre: "La matière",
  gros_plans: [
    { legende: "Noyer", image: image("Grain de noyer huilé, gros plan") },
    {
      legende: "Laiton",
      image: image("Laiton brossé, reflet doux, gros plan"),
    },
    {
      legende: "Assemblage",
      image: image("Assemblage noyer et laiton, gros plan"),
    },
    {
      legende: "Finition",
      image: image("Surface de noyer huilée à la main, gros plan"),
    },
  ],
};

export const produits: ProduitResume[] = [
  {
    slug: "lucerne-classic",
    modele: "Lucerne",
    gamme: "Classic",
    prix_ttc_centimes: 48000,
    image_principale: image("Lampe Lucerne Classic"),
  },
  {
    slug: "lucerne-premium",
    modele: "Lucerne",
    gamme: "Premium",
    prix_ttc_centimes: 124000,
    image_principale: image("Lampe Lucerne Premium"),
  },
  {
    slug: "leman-classic",
    modele: "Léman",
    gamme: "Classic",
    prix_ttc_centimes: 39000,
    image_principale: image("Lampe Léman Classic"),
  },
];

/** Produits portant le drapeau « mis en avant » (`?mis_en_avant=true`). */
export const slugsMisEnAvant = ["lucerne-classic", "lucerne-premium"];

const modeles: Record<string, Omit<Modele, "produits">> = {
  lucerne: {
    slug: "lucerne",
    nom: "Lucerne",
    description: "Pied en noyer massif, finition laiton.",
  },
  leman: {
    slug: "leman",
    nom: "Léman",
    description: "Lampe de chevet aux lignes simples.",
  },
};

export const modeleDe = (nom: string) =>
  Object.values(modeles).find((m) => m.nom === nom)!;

export function detailDe(p: ProduitResume): ProduitDetail {
  const modele = modeleDe(p.modele);
  const autre = produits.find(
    (x) => x.modele === p.modele && x.gamme !== p.gamme,
  );
  return {
    slug: p.slug,
    modele,
    gamme: p.gamme,
    prix_ttc_centimes: p.prix_ttc_centimes,
    caracteristiques: { hauteur_cm: 42, diametre_cm: 28, culot: "E27" },
    matieres: [
      { nom: "Noyer", role: "Pied", entretien: "Huiler une fois par an." },
      { nom: "Laiton", role: "Finition", entretien: "Chiffon doux et sec." },
    ],
    medias: p.image_principale
      ? [
          p.image_principale,
          image(`${p.image_principale.alt}, vue de détail du pied en noyer`),
          image(`${p.image_principale.alt}, allumée dans une pièce`),
        ]
      : [],
    autre_gamme: autre?.slug ?? null,
  };
}

export function modeleComplet(slug: string): Modele | undefined {
  const modele = modeles[slug];
  if (!modele) return undefined;
  return {
    ...modele,
    produits: produits.filter((p) => p.modele === modele.nom),
  };
}

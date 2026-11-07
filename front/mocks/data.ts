import type {
  HeroAccueil,
  Image,
  MatiereAccueil,
  Modele,
  PageContenu,
  ProduitDetail,
  ProduitResume,
} from "@/lib/api/types";

// Illustrations de démonstration (front/public/mocks/<nom>-<largeur>.webp), en attendant les vraies photos.
const image = (alt: string, nom: string): Image => ({
  alt,
  largeur_origine: 1600,
  hauteur_origine: 1200,
  sources: [480, 960, 1600].map((largeur) => ({
    largeur: largeur as 480 | 960 | 1600,
    url: `/mocks/${nom}-${largeur}.webp`,
  })),
});

export const heroAccueil: HeroAccueil = {
  titre: "Une lumière qui prend son temps",
  mot_italique: "prend son temps",
  sous_titre:
    "Lampes semi-artisanales en noyer et laiton, assemblées à Genève. Deux gammes, mêmes formes, matières différentes.",
  cta_libelle: "Découvrir les lampes",
  cta_chemin: "/produits/classic",
  image: image(
    "Lampe en noyer posée sur une table, dans la lumière du matin",
    "hero",
  ),
};

export const matiereAccueil: MatiereAccueil = {
  titre: "La matière",
  gros_plans: [
    {
      legende: "Noyer",
      image: image("Grain de noyer huilé, gros plan", "matiere-noyer"),
    },
    {
      legende: "Laiton",
      image: image("Laiton brossé, reflet doux, gros plan", "matiere-laiton"),
    },
    {
      legende: "Assemblage",
      image: image(
        "Assemblage noyer et laiton, gros plan",
        "matiere-assemblage",
      ),
    },
    {
      legende: "Finition",
      image: image(
        "Surface de noyer huilée à la main, gros plan",
        "matiere-finition",
      ),
    },
  ],
};

export const produits: ProduitResume[] = [
  {
    slug: "lucerne-classic",
    modele: "Lucerne",
    gamme: "Classic",
    prix_ttc_centimes: 48000,
    image_principale: image("Lampe Lucerne Classic", "lucerne-classic"),
  },
  {
    slug: "lucerne-premium",
    modele: "Lucerne",
    gamme: "Premium",
    prix_ttc_centimes: 124000,
    image_principale: image("Lampe Lucerne Premium", "lucerne-premium"),
  },
  {
    slug: "leman-classic",
    modele: "Léman",
    gamme: "Classic",
    prix_ttc_centimes: 39000,
    image_principale: image("Lampe Léman Classic", "leman-classic"),
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
          p.image_principale as Image,
          image(
            `${p.image_principale.alt}, vue de détail du pied en noyer`,
            `${p.slug}-detail`,
          ),
          image(
            `${p.image_principale.alt}, allumée dans une pièce`,
            `${p.slug}-allumee`,
          ),
          image("Grain du noyer, gros plan", "matiere-noyer"),
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

const atelier: PageContenu = {
  slug: "atelier",
  titre: "L'atelier",
  description: "Là où naissent les lampes Noyer, à Genève.",
  blocs: [
    {
      type: "titre",
      niveau: 2,
      segments: [
        { texte: "Le geste, " },
        { texte: "lentement", italique: true },
      ],
    },
    {
      type: "paragraphe",
      segments: [
        { texte: "Chaque lampe est tournée en " },
        { texte: "noyer", gras: true },
        { texte: " puis huilée à la main. " },
        { texte: "Voir la sélection", lien: "/produits" },
        { texte: "." },
      ],
    },
    {
      type: "image",
      image: image(
        "Mains huilant un pied de lampe en noyer, dans l'atelier",
        "matiere-finition",
      ),
      legende: "L'huilage, dernière étape avant l'assemblage.",
    },
    {
      type: "section",
      ton: "sombre",
      blocs: [
        {
          type: "citation",
          segments: [{ texte: "Le bois décide de la forme." }],
          auteur: "L'atelier",
        },
        {
          type: "paragraphe",
          segments: [{ texte: "Chaque pièce garde la trace de son bois." }],
        },
      ],
    },
    {
      type: "section",
      ton: "clair",
      blocs: [
        {
          type: "liste",
          ordonnee: false,
          items: [[{ texte: "Noyer suisse" }], [{ texte: "Laiton massif" }]],
        },
        {
          type: "image",
          image: image(
            "Établi de l'atelier avec outils et pièces de laiton",
            "matiere-assemblage",
          ),
        },
      ],
    },
  ],
};

const pageLegale = (
  slug: string,
  titre: string,
  description: string,
  paragraphes: string[],
): PageContenu => ({
  slug,
  titre,
  description,
  mis_a_jour: "2026-11-01",
  blocs: [
    { type: "titre", niveau: 2, segments: [{ texte: titre }] },
    ...paragraphes.map((texte) => ({
      type: "paragraphe" as const,
      segments: [{ texte }],
    })),
  ],
});

const impressum = pageLegale(
  "impressum",
  "Impressum",
  "Raison sociale, adresse et numéro IDE de Noyer.",
  [
    "Noyer, atelier de lampes artisanales — Genève, Suisse.",
    "Numéro IDE : CHE-000.000.000.",
  ],
);

const cgv = pageLegale(
  "cgv",
  "Conditions générales de vente",
  "Conditions de vente en ligne des lampes Noyer.",
  [
    "Les prix sont indiqués en francs suisses, TVA comprise.",
    "Le paiement s'effectue par TWINT, carte ou virement pour le Premium.",
  ],
);

const confidentialite = pageLegale(
  "confidentialite",
  "Politique de confidentialité",
  "Traitement de vos données personnelles (nLPD).",
  [
    "Noyer traite vos données conformément à la nouvelle loi fédérale sur la protection des données (nLPD).",
    "Vous pouvez demander l'accès, la rectification ou l'effacement de vos données.",
  ],
);

/** Pages éditoriales du mock ; `brouillon` : visible seulement avec le jeton d'aperçu. */
export const pagesContenu: Record<
  string,
  { contenu: PageContenu; brouillon?: boolean }
> = {
  atelier: { contenu: atelier },
  impressum: { contenu: impressum },
  cgv: { contenu: cgv },
  confidentialite: { contenu: confidentialite },
  brouillon: {
    contenu: { ...atelier, slug: "brouillon", titre: "Brouillon" },
    brouillon: true,
  },
};

// Types du contrat docs/api.md (à régénérer depuis /api/schema/ quand le back l'expose, B0-03).

export type Gamme = "Classic" | "Premium";

export type Image = {
  alt: string;
  largeur_origine: number;
  hauteur_origine: number;
  sources: { largeur: 480 | 960 | 1600; url: string }[];
};

export type ProduitResume = {
  slug: string;
  modele: string;
  gamme: Gamme;
  prix_ttc_centimes: number;
  image_principale: Image | null;
};

export type HeroAccueil = {
  titre: string;
  mot_italique: string | null; // fragment de `titre` à mettre en italique
  sous_titre: string;
  cta_libelle: string;
  cta_chemin: string; // chemin public sans préfixe de langue ("/produits/classic")
  image: Image | null;
};

export type MatiereAccueil = {
  titre: string;
  gros_plans: { legende: string; image: Image }[];
};

/** Fragment de texte riche ; les marques sont combinables. */
export type SegmentTexte = {
  texte: string;
  italique?: boolean;
  gras?: boolean;
  /** Lien : chemin public sans préfixe de langue ("/atelier") ou URL https. */
  lien?: string;
};

export type BlocTexte =
  | { type: "titre"; niveau: 2 | 3; segments: SegmentTexte[] }
  | { type: "paragraphe"; segments: SegmentTexte[] }
  | { type: "citation"; segments: SegmentTexte[]; auteur?: string | null }
  | { type: "liste"; ordonnee: boolean; items: SegmentTexte[][] }
  | { type: "image"; image: Image; legende?: string | null }
  | { type: "section"; ton: TonSection; blocs: BlocTexte[] };

/** Registre d'une section éditoriale : clair (défaut), fond alterné ou sombre. */
export type TonSection = "clair" | "alt" | "sombre";

export type PageContenu = {
  slug: string;
  titre: string;
  description: string;
  /** Date de dernière mise à jour (AAAA-MM-JJ), affichée sur les pages légales. */
  mis_a_jour?: string;
  blocs: BlocTexte[];
};

export type Page<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type ProduitDetail = {
  slug: string;
  modele: { slug: string; nom: string; description: string };
  gamme: Gamme;
  prix_ttc_centimes: number;
  caracteristiques: { hauteur_cm: number; diametre_cm: number; culot: string };
  matieres: { nom: string; role: string; entretien: string }[];
  medias: Image[];
  autre_gamme: string | null;
};

export type Modele = {
  slug: string;
  nom: string;
  description: string;
  produits: ProduitResume[];
};

export type Disponibilite =
  | { gamme: "Classic"; quantite_disponible: number }
  | {
      gamme: "Premium";
      series: {
        id: number;
        taille_serie: number;
        pieces_restantes: number;
        numeros_disponibles: number[];
      }[];
    };

export type LignePanier = {
  id: string;
  produit: ProduitResume;
  quantite: number;
  numero_piece: number | null;
  reservation_expire_le: string | null;
};

export type Panier = {
  lignes: LignePanier[];
  sous_total_centimes: number;
  frais_livraison_centimes: number;
  tva_incluse_centimes: number;
  taux_tva: string;
  total_centimes: number;
};

export type Adresse = {
  nom: string;
  rue: string;
  npa: string;
  localite: string;
  pays: string;
};

export type ModeLivraison = "livraison" | "retrait_atelier";

export type CommandeCreation = {
  email: string;
  adresse_livraison: Adresse;
  adresse_facturation: Adresse | null;
  mode_livraison: ModeLivraison;
  cgv_acceptees: boolean;
};

export type StatutCommande = "EnAttente" | "Payee" | "Expediee" | "Annulee";

export type CommandeCreee = {
  reference: string;
  statut: StatutCommande;
  total_centimes: number;
};

export type Commande = {
  reference: string;
  statut: StatutCommande;
  cree_le: string;
  lignes: {
    nom_produit: string;
    gamme: Gamme;
    numero_piece: number | null;
    prix_unitaire_centimes: number;
    quantite: number;
  }[];
  total_centimes: number;
};

export type Paiement =
  | { methode: "stripe"; url_paiement: string }
  | {
      methode: "virement";
      iban: string;
      beneficiaire: string;
      reference: string;
      delai_jours: number;
    };

export type ContactMessage = {
  nom: string;
  email: string;
  message: string;
  consentement: boolean;
  site_web: string;
};

export type ErreurApi = {
  erreur: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
};

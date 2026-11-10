BRIEF DE MARQUE & SPÉCIFICATIONS SITE WEB
Noyer
Marque de lampes semi-artisanales
fabriquées à Genève. Deux gammes —
Classic et Premium — mêmes formes,
matières différentes.
Document à l'attention du développeur / de l'agence web.
Maquette de référence (homepage) : claude.ai/artifact/1iffYuSDiy5kg68Nkgt2aG
01 Positionnement
Artisanat + design contemporain + sobriété suisse. Éviter tout ce qui fait « marché artisanal » (trop rustique) ou « produit industriel » (trop froid). Le
Premium doit se lire comme une montée en gamme du Classic — même silhouette, matière et finition supérieures — jamais comme une gamme à part.
02 Palette de couleurs
Décision client du 10.11.2026 : le registre sombre devient la règle sur tout le site (maquette : docs/maquette-luxe/). Le registre clair n'est plus utilisé par défaut.
Rôle Registre sombre (par défaut) Registre clair (rare, héritage)
Fond principal #29251F #F5F1E8
Fond section alternée #3A3028 #DED3C2
Texte principal #F5F1E8 #29251F
Texte secondaire #DED3C2 #604735
Bouton primaire fond #B08D57 (laiton), texte #29251F fond #29251F, texte #F5F1E8
Bouton primaire — hover fond #DED3C2 fond #3A3028
Bouton secondaire (outline) bordure #B08D57 bordure #604735
Bordures / séparateurs #B08D57 à 20% #604735 à 15%
Accent Classic #604735 (noyer)
Accent Premium #B08D57 (laiton)
Règle stricte : le laiton ( #B08D57 ) n'est jamais un aplat de fond de section. Il sert aux filets 1px, aux surtitres, aux icônes, au bouton principal (aplat laiton, texte sombre) et au cerclage du bouton secondaire.
Contraste : tous les textes ≥ 4.5:1 sur #29251F et #3A3028 (vérifié par tests). Le laiton en texte n'est utilisé que sur #29251F.
03 Typographie
Titres / logo : Fraunces (Google Fonts) — serif contemporain, poids 300 pour les titres (très grands), 400 à 600 ailleurs, utiliser aussi l'italique (poids 400-500) pour quelques accents ponctuels.
Texte courant / UI : Hanken Grotesk (Google Fonts) — poids 400, 500, 600.
Import Google Fonts :
<link href="https://fonts.googleapis.com/css2?
family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400;1,9..144,500&family=Hanken+Grotesk:wght@400;500;600;700&displa
y=swap" rel="stylesheet">
Titres en Fraunces, jamais en majuscules systématiques. Surtitres, menus et boutons : petites capitales Hanken Grotesk 11px, espacées (0.22 à 0.4em). Logo en capitales espacées. Corps de texte en Hanken Grotesk, taille de base ~16-17px, lignes de texte < 80 caractères.
04 Design tokens CSS
:root{
--bg:#29251F; /* sombre par défaut */
--bg-alt:#3A3028;
--text:#F5F1E8;
--text-muted:#DED3C2;
--walnut:#604735;
--brass:#B08D57;
--espresso:#3A3028;
--dark-bg:#29251F;
--dark-bg-alt:#3A3028;
--dark-text:#F5F1E8;
--border:rgba(176,141,87,0.2);
--radius:2px;
--serif:'Fraunces'
, Georgia, serif;
--sans:'Hanken Grotesk'
,
-apple-system, sans-serif;
}
--radius volontairement très faible (2px) : pas de boutons arrondis type SaaS, cohérent avec l'esprit architecture / menuiserie.
05 Structure du site
Homepage
1. Nav (logo + 3 liens + CTA)
2. Hero (accroche + illustration/photo produit)
3. La matière (4 gros plans texture bois/laiton)
4. Deux gammes (cartes Classic / Premium côte à côte)
5. L'atelier (section registre sombre, storytelling fabrication)
6. Sélection produits
7. Footer (Genève, contact, newsletter, mentions légales)
Pages à prévoir
Page produit Classic (dimensions, matières, entretien, prix)
Page produit Premium (idem, insister sur le processus de fabrication / numérotation)
Page « L'atelier » / « Notre histoire »
Page contact / showroom si applicable
Boutique / commande (voir section e-commerce)
Mentions légales, CGV, politique de confidentialité
06 Direction photo
Lumière naturelle et douce, jamais de studio froid type catalogue.
Gros plans matière (grain du bois, laiton) au moins aussi présents que les photos produit entier.
Photos atelier : gestes, outils, mains au travail — documentaire, pas posé.
Produits toujours en contexte (intérieur, matériaux bruts), jamais sur fond blanc pur.
Cohérence colorimétrique : les photos doivent se fondre visuellement dans le fond sombre du site (éviter le très contrasté / froid).
Point critique : sans photos réelles de qualité, le site perdra une grande partie de son effet « marque premium ». C'est le point le plus structurant à budgéter avant le
développement.
07 Points techniques à ne pas oublier
Responsive
Breakpoints suggérés : mobile < 600px, tablette 600-900px, desktop > 900px. Vérifier particulièrement les cartes Classic/Premium (empilées en mobile) et la
navigation (menu burger < 800px).
Accessibilité
Contraste texte/fond à vérifier (le texte secondaire #DED3C2 sur #29251F et #3A3028 doit rester ≥ 4.5:1).
États de focus clavier visibles (pas de outline:none sans remplacement).
Alt text descriptif sur toutes les photos produit/matière.
Performance
Images en WebP/AVIF, plusieurs résolutions ( srcset ), lazy loading sous la ligne de flottaison. Le poids des photos est souvent le premier facteur de lenteur sur
ce type de site très visuel — compresser sans dégrader le rendu du grain du bois.
SEO
Titres/meta descriptions par page produit.
Données structurées Product (schema.org) si vente en ligne, avec prix et disponibilité.
URLs propres ( /produits/lucerne-classic , /produits/lucerne-premium ).
Suisse — aspects légaux
Mentions légales / Impressum obligatoires (raison sociale, adresse, IDE si applicable).
Conformité nLPD (nouvelle loi sur la protection des données, en vigueur depuis 2023) : bannière de consentement cookies si trackers, politique de
confidentialité claire.
CGV si vente en ligne : droit de rétractation, garanties, TVA suisse (7.7% / 8.1% selon période), frais de livraison.
Langues
Décider si le site est FR uniquement ou FR/EN/DE (Genève francophone, mais clientèle suisse-allemande et internationale probable pour du haut de gamme).
Prévoir l'architecture multilingue dès le départ si oui — plus coûteux à ajouter après coup.
E-commerce / paiement
Si vente directe en ligne : prévoir TWINT (très utilisé en Suisse), cartes bancaires, éventuellement virement pour le Premium (achat plus réfléchi). Plateforme à
trancher avec le développeur : Shopify, Webflow + e-commerce, ou solution custom selon volume attendu et besoin de gestion de stock (pièces en série limitée
numérotée).
CMS
Recommandé : un CMS permettant de gérer facilement l'ajout de nouvelles photos et de futurs produits sans dépendre du développeur à chaque mise à jour
(Webflow CMS, Shopify, ou WordPress headless selon préférence du développeur).
Nom de domaine
Privilégier un .ch en plus d'un .com si le nom de marque final est disponible.
Dark mode
Le registre sombre est un choix de marque, pas un mode sombre système : le site est toujours sombre, indépendamment des préférences système du visiteur.
08 Décisions encore ouvertes
Nom de marque définitif (« Noyer » est un placeholder utilisé pour la maquette).
Logo final (actuellement : nom en typographie Fraunces, pas de pictogramme).
Langues du site.
Vente en ligne directe ou site vitrine + contact/showroom.
Budget et calendrier photo.
/*
    - MariaDB Script
    - Database For "Noyer"
    - Diego Martins
    - 02.10.26
*/

USE noyer;

-- ========== Vues ==========

-- Create View "v_Catalogue"
-- Liste des produits avec leur modèle et leur gamme
CREATE OR REPLACE VIEW `v_Catalogue` AS
SELECT
    p.`id`,
    p.`slug`,
    m.`nom`                 AS `modele`,
    g.`code`                AS `gamme`,
    p.`prix_ttc_centimes`,
    p.`actif`,
    p.`id_modele`
FROM `Produit` p
JOIN `Modele` m ON m.`id` = p.`id_modele`
JOIN `Gamme`  g ON g.`id` = p.`id_gamme`;

-- Create View "v_Disponibilite_Premium"
-- Nombre de pièces restantes par série Premium
CREATE OR REPLACE VIEW `v_Disponibilite_Premium` AS
SELECT
    s.`id_produit`,
    s.`id`                                          AS `id_serie`,
    s.`taille_serie`,
    COALESCE(SUM(pc.`statut` = 'Disponible'), 0)   AS `pieces_restantes`
FROM `Serie` s
LEFT JOIN `Piece` pc ON pc.`id_serie` = s.`id`
GROUP BY s.`id`, s.`id_produit`, s.`taille_serie`;

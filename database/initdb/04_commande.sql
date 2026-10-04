/*
    - MariaDB Script
    - Database For "Noyer"
    - Diego Martins
    - 02.10.26
*/

USE noyer;

-- ========== Domaine Commande ==========

-- Create Table "Commande"
CREATE TABLE IF NOT EXISTS `Commande`
(
    `id`                          INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `reference`                   VARCHAR(20) NOT NULL UNIQUE,
    `client_email`                VARCHAR(254) NOT NULL,
    `statut`                      ENUM('EnAttente', 'Payee', 'Expediee', 'Annulee') NOT NULL DEFAULT 'EnAttente',
    `total_ttc_centimes`          INT UNSIGNED NOT NULL,
    `frais_livraison_centimes`    INT UNSIGNED NOT NULL DEFAULT 0,
    `taux_tva`                    DECIMAL(4,2) NOT NULL,
    `date_creation`               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `date_modification`           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_commande_email` (`client_email`)
) ENGINE=InnoDB;

-- Create Table "Ligne_Commande"
-- Note : nom, gamme et prix sont copiés au moment de l'achat,
--        pour que la commande reste juste si le catalogue change
CREATE TABLE IF NOT EXISTS `Ligne_Commande`
(
    `id`                        INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `id_produit`                INT NOT NULL,
    `nom_produit`               VARCHAR(120) NOT NULL,
    `gamme`                     ENUM('Classic', 'Premium') NOT NULL,
    `prix_unitaire_centimes`    INT UNSIGNED NOT NULL,
    `quantite`                  SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    `id_commande`               INT NOT NULL,
    `id_piece`                  INT NULL,
    CONSTRAINT `fk_ligne_commande_commande`
        FOREIGN KEY (`id_commande`)
        REFERENCES `Commande`(`id`)
        ON DELETE CASCADE,
    CONSTRAINT `fk_ligne_commande_produit`
        FOREIGN KEY (`id_produit`)
        REFERENCES `Produit`(`id`),
    CONSTRAINT `fk_ligne_commande_piece`
        FOREIGN KEY (`id_piece`)
        REFERENCES `Piece`(`id`)
) ENGINE=InnoDB;

-- Create Table "Adresse"
CREATE TABLE IF NOT EXISTS `Adresse`
(
    `id`                INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `type`              ENUM('Livraison', 'Facturation') NOT NULL,
    `nom`               VARCHAR(120) NOT NULL,
    `rue`               VARCHAR(254) NOT NULL,
    `npa`               VARCHAR(10) NOT NULL,
    `localite`          VARCHAR(120) NOT NULL,
    `pays`              CHAR(2) NOT NULL DEFAULT 'CH',
    `id_commande`       INT NOT NULL,
    -- Cardinalité 1,2 : une adresse de chaque type au maximum par commande
    CONSTRAINT `uq_adresse_commande_type`
        UNIQUE (`id_commande`, `type`),
    CONSTRAINT `fk_adresse_commande`
        FOREIGN KEY (`id_commande`)
        REFERENCES `Commande`(`id`)
        ON DELETE CASCADE
) ENGINE=InnoDB;

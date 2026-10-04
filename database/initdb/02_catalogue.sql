/*
    - MariaDB Script
    - Database For "Noyer"
    - Diego Martins
    - 02.10.26
*/

USE noyer;

-- ========== Domaine Catalogue ==========

-- Create Table "Modele"
CREATE TABLE IF NOT EXISTS `Modele`
(
    `id`                INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `slug`              VARCHAR(120) NOT NULL UNIQUE,
    `nom`               VARCHAR(65) NOT NULL,
    `description`       TEXT NULL,
    `date_creation`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Create Table "Gamme"
CREATE TABLE IF NOT EXISTS `Gamme`
(
    `id`                INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `code`              ENUM('Classic', 'Premium') NOT NULL UNIQUE,
    `nom`               VARCHAR(65) NOT NULL
) ENGINE=InnoDB;

-- Create Table "Produit"
CREATE TABLE IF NOT EXISTS `Produit`
(
    `id`                    INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `slug`                  VARCHAR(120) NOT NULL UNIQUE,
    `prix_ttc_centimes`     INT UNSIGNED NOT NULL,
    `caracteristiques`      JSON NULL,
    `actif`                 BOOLEAN NOT NULL DEFAULT TRUE,
    `date_creation`         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `date_modification`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `id_modele`              INT NOT NULL,
    `id_gamme`              INT NOT NULL,
    CONSTRAINT `uq_produit_modele_gamme`
        UNIQUE (`id_modele`, `id_gamme`),
    CONSTRAINT `fk_produit_modele`
        FOREIGN KEY (`id_modele`)
        REFERENCES `Modele`(`id`),
    CONSTRAINT `fk_produit_gamme`
        FOREIGN KEY (`id_gamme`)
        REFERENCES `Gamme`(`id`)
) ENGINE=InnoDB;

-- Create Table "Matiere"
CREATE TABLE IF NOT EXISTS `Matiere`
(
    `id`                INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `nom`               VARCHAR(65) NOT NULL UNIQUE,
    `entretien`         TEXT NULL
) ENGINE=InnoDB;

-- Create Table "Produit_Matiere" (association n,n "COMPOSER")
CREATE TABLE IF NOT EXISTS `Produit_Matiere`
(
    `id_produit`        INT NOT NULL,
    `id_matiere`        INT NOT NULL,
    `role`              VARCHAR(65) NOT NULL,
    PRIMARY KEY (`id_produit`, `id_matiere`),
    CONSTRAINT `fk_produit_matiere_produit`
        FOREIGN KEY (`id_produit`)
        REFERENCES `Produit`(`id`)
        ON DELETE CASCADE,
    CONSTRAINT `fk_produit_matiere_matiere`
        FOREIGN KEY (`id_matiere`)
        REFERENCES `Matiere`(`id`)
) ENGINE=InnoDB;

-- Create Table "Media"
CREATE TABLE IF NOT EXISTS `Media`
(
    `id`                INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `url`               VARCHAR(500) NOT NULL,
    `alt`               VARCHAR(254) NOT NULL,
    `ordre`             SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    `id_produit`        INT NOT NULL,
    INDEX `idx_media_produit_ordre` (`id_produit`, `ordre`),
    CONSTRAINT `fk_media_produit`
        FOREIGN KEY (`id_produit`)
        REFERENCES `Produit`(`id`)
        ON DELETE CASCADE
) ENGINE=InnoDB;

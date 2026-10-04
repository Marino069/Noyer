/*
    - MariaDB Script
    - Database For "Noyer"
    - Diego Martins
    - 02.10.26
*/

USE noyer;

-- ========== Domaine Inventaire ==========

-- Create Table "Stock_Classic"
CREATE TABLE IF NOT EXISTS `Stock_Classic`
(
    `id`                    INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `id_produit`            INT NOT NULL UNIQUE,
    `quantite_dispo`        INT UNSIGNED NOT NULL DEFAULT 0,
    `quantite_reservee`     INT UNSIGNED NOT NULL DEFAULT 0,
    `date_modification`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_stock_classic_produit`
        FOREIGN KEY (`id_produit`)
        REFERENCES `Produit`(`id`)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- Create Table "Serie"
CREATE TABLE IF NOT EXISTS `Serie`
(
    `id`                INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `id_produit`        INT NOT NULL,
    `taille_serie`      SMALLINT UNSIGNED NOT NULL,
    `date_creation`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_serie_produit` (`id_produit`),
    CONSTRAINT `fk_serie_produit`
        FOREIGN KEY (`id_produit`)
        REFERENCES `Produit`(`id`)
) ENGINE=InnoDB;

-- Create Table "Piece"
CREATE TABLE IF NOT EXISTS `Piece`
(
    `id`                INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `numero`            SMALLINT UNSIGNED NOT NULL,
    `statut`            ENUM('Disponible', 'Reservee', 'Vendue') NOT NULL DEFAULT 'Disponible',
    `version`           INT UNSIGNED NOT NULL DEFAULT 0,
    `id_serie`          INT NOT NULL,
    CONSTRAINT `uq_piece_serie_numero`
        UNIQUE (`id_serie`, `numero`),
    CONSTRAINT `fk_piece_serie`
        FOREIGN KEY (`id_serie`)
        REFERENCES `Serie`(`id`)
) ENGINE=InnoDB;

-- Create Table "Reservation"
CREATE TABLE IF NOT EXISTS `Reservation`
(
    `id`                INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `id_produit`        INT NOT NULL,
    `quantite`          SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    `panier_id`         CHAR(36) NOT NULL,
    `expire_le`         DATETIME NOT NULL,
    `statut`            ENUM('Active', 'Confirmee', 'Expiree', 'Annulee') NOT NULL DEFAULT 'Active',
    `date_creation`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `id_piece`          INT NULL,
    -- Sécurité : une pièce ne peut avoir qu'une seule réservation active à la fois
    `id_piece_active`   INT AS (IF(`statut` = 'Active', `id_piece`, NULL)) PERSISTENT,
    CONSTRAINT `uq_reservation_piece_active`
        UNIQUE (`id_piece_active`),
    INDEX `idx_reservation_expiration` (`statut`, `expire_le`),
    INDEX `idx_reservation_panier` (`panier_id`),
    CONSTRAINT `fk_reservation_piece`
        FOREIGN KEY (`id_piece`)
        REFERENCES `Piece`(`id`),
    CONSTRAINT `fk_reservation_produit`
        FOREIGN KEY (`id_produit`)
        REFERENCES `Produit`(`id`)
) ENGINE=InnoDB;

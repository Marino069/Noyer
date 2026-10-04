/*
    - MariaDB Script
    - Database For "Noyer"
    - Diego Martins
    - 02.10.26
*/

USE noyer;

-- ========== Domaine Paiement ==========

-- Create Table "Transaction_Paiement"
CREATE TABLE IF NOT EXISTS `Transaction_Paiement`
(
    `id`                    INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `id_commande`           INT NOT NULL,
    `methode`               ENUM('Twint', 'Carte', 'Virement') NOT NULL,
    `prestataire`           VARCHAR(65) NOT NULL,
    `ref_prestataire`       VARCHAR(120) NULL UNIQUE,
    `montant_centimes`      INT UNSIGNED NOT NULL,
    `statut`                ENUM('Creee', 'Autorisee', 'Confirmee', 'Echouee', 'Remboursee') NOT NULL DEFAULT 'Creee',
    `date_creation`         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `date_modification`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_transaction_commande` (`id_commande`),
    CONSTRAINT `fk_transaction_commande`
        FOREIGN KEY (`id_commande`)
        REFERENCES `Commande`(`id`)
) ENGINE=InnoDB;

-- Create Table "Webhook"
-- Note : la clé primaire est l'identifiant du prestataire (anti-doublon)
CREATE TABLE IF NOT EXISTS `Webhook`
(
    `id_evenement`      VARCHAR(120) NOT NULL PRIMARY KEY,
    `payload`           JSON NOT NULL,
    `traite`            BOOLEAN NOT NULL DEFAULT FALSE,
    `recu_le`           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `id_transaction`    INT NOT NULL,
    CONSTRAINT `fk_webhook_transaction`
        FOREIGN KEY (`id_transaction`)
        REFERENCES `Transaction_Paiement`(`id`)
) ENGINE=InnoDB;

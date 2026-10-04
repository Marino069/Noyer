/*
    - MariaDB Script
    - Database For "Noyer"
    - Diego Martins
    - 02.10.26
*/

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- Create Users
-- /!\ Remplacer les mots de passe avant tout déploiement
-- adm_noyer : migrations et administration
DROP USER IF EXISTS 'adm_noyer'@'%';
CREATE USER 'adm_noyer'@'%' IDENTIFIED BY 'CHANGE_ME_admin';

-- app_noyer : utilisé par le back (données uniquement)
DROP USER IF EXISTS 'app_noyer'@'%';
CREATE USER 'app_noyer'@'%' IDENTIFIED BY 'CHANGE_ME_app';

-- Create Database "Noyer"
DROP DATABASE IF EXISTS noyer;
CREATE DATABASE IF NOT EXISTS noyer CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Privileges for users
GRANT ALL PRIVILEGES ON noyer.* TO 'adm_noyer'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON noyer.* TO 'app_noyer'@'%';

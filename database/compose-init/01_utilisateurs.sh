#!/bin/bash
# Docker Compose : crée la base et les deux comptes à partir des variables d'environnement.
# Les tables sont créées par les migrations Django (service back), pas par ce script.
set -euo pipefail
mariadb -uroot -p"${MARIADB_ROOT_PASSWORD}" <<SQL
CREATE DATABASE IF NOT EXISTS noyer CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'adm_noyer'@'%' IDENTIFIED BY '${NOYER_ADM_PASSWORD}';
CREATE USER IF NOT EXISTS 'app_noyer'@'%' IDENTIFIED BY '${NOYER_APP_PASSWORD}';
GRANT ALL PRIVILEGES ON noyer.* TO 'adm_noyer'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON noyer.* TO 'app_noyer'@'%';
FLUSH PRIVILEGES;
SQL

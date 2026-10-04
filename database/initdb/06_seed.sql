/*
    - MariaDB Script
    - Database For "Noyer"
    - Diego Martins
    - 02.10.26
*/

-- Données de référence

USE noyer;

INSERT INTO `Gamme` (`code`, `nom`) VALUES
    ('Classic', 'Classic'),
    ('Premium', 'Premium');

INSERT INTO `Matiere` (`nom`, `entretien`) VALUES
    ('Noyer', 'Dépoussiérer avec un chiffon sec. Huiler une fois par an.'),
    ('Laiton', 'Chiffon doux et sec. Pas de produit abrasif.');


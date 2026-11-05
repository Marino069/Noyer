/** Clé de sessionStorage où le checkout garde l'e-mail d'une commande pour la confirmation. */
export const cleEmailCommande = (reference: string) =>
  `noyer:commande-email:${reference}`;
